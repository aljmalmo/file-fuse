// === المتغيرات ===
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const fileList = document.getElementById("fileList");
const fileListSection = document.getElementById("fileListSection");
const mergeOptions = document.getElementById("mergeOptions");
const outputFormat = document.getElementById("outputFormat");
const outputFilename = document.getElementById("outputFilename");
const mergeButton = document.getElementById("mergeButton");
const fileCount = document.getElementById("fileCount");
const statusMessage = document.getElementById("statusMessage");
const darkModeToggle = document.getElementById("darkModeToggle");

let uploadedFiles = [];

// === دعم السحب والإفلات ===
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.opacity = "0.8";
});
dropZone.addEventListener("dragleave", () => {
  dropZone.style.opacity = "1";
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.style.opacity = "1";
  const files = Array.from(e.dataTransfer.files);
  handleFiles(files);
});
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);
  handleFiles(files);
});

// === معالجة الملفات ===
function handleFiles(files) {
  const supportedTypes = ["text/plain", "text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  let newFiles = [];

  files.forEach((file) => {
    if (!supportedTypes.includes(file.type)) {
      showStatus(`الملف "${file.name}" غير مدعوم.`, "error");
      return;
    }

    if (file.size === 0) {
      showStatus(`الملف "${file.name}" فارغ.`, "error");
      return;
    }

    if (file.size > maxFileSize) {
      showStatus(`الملف "${file.name}" كبير جدًا (>${maxFileSize/1024/1024}MB).`, "error");
      return;
    }

    newFiles.push({
      file,
      name: file.name,
      size: file.size,
      content: null,
    });
  });

  if (newFiles.length > 0) {
    uploadedFiles.push(...newFiles);
    updateFileList();
    showStatus(`تم رفع ${newFiles.length} ملف(ات) بنجاح.`, "success");
  }
}

// === تحديث قائمة الملفات ===
function updateFileList() {
  fileList.innerHTML = "";
  fileCount.textContent = uploadedFiles.length;

  uploadedFiles.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "file-item";
    li.draggable = true;

    li.innerHTML = `
      <div style="flex-grow:1;">
        <div class="file-name">${item.name}</div>
        <div class="file-size">${formatFileSize(item.size)}</div>
      </div>
      <button class="move-up" title="تحريك لأعلى">⏶</button>
      <button class="move-down" title="تحريك لأسفل">⏷</button>
      <button class="preview-btn" title="معاينة">👁</button>
      <button class="remove-btn" title="حذف">🗑</button>
    `;

    // تحريك لأعلى
    li.querySelector(".move-up").addEventListener("click", (e) => {
      e.stopPropagation();
      if (index > 0) {
        [uploadedFiles[index], uploadedFiles[index - 1]] = [uploadedFiles[index - 1], uploadedFiles[index]];
        updateFileList();
      }
    });

    // تحريك لأسفل
    li.querySelector(".move-down").addEventListener("click", (e) => {
      e.stopPropagation();
      if (index < uploadedFiles.length - 1) {
        [uploadedFiles[index], uploadedFiles[index + 1]] = [uploadedFiles[index + 1], uploadedFiles[index]];
        updateFileList();
      }
    });

    // معاينة
    li.querySelector(".preview-btn").addEventListener("click", () => previewFile(item));

    // حذف
    li.querySelector(".remove-btn").addEventListener("click", () => {
      uploadedFiles.splice(index, 1);
      updateFileList();
    });

    // سحب الملف
    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", index);
    });

    li.addEventListener("dragover", (e) => e.preventDefault());
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
      const toIndex = index;
      if (fromIndex !== toIndex) {
        const movedItem = uploadedFiles.splice(fromIndex, 1)[0];
        uploadedFiles.splice(toIndex, 0, movedItem);
        updateFileList();
      }
    });

    fileList.appendChild(li);
  });

  // عرض الأقسام عند وجود ملفات
  if (uploadedFiles.length > 0) {
    fileListSection.classList.remove("hidden");
    mergeOptions.classList.remove("hidden");
  } else {
    fileListSection.classList.add("hidden");
    mergeOptions.classList.add("hidden");
  }
}

// === معاينة الملف ===
function previewFile(item) {
  if (!item.content) {
    readAllFiles(() => showPreviewModal(item));
  } else {
    showPreviewModal(item);
  }
}

function showPreviewModal(item) {
  const modal = document.createElement("div");
  modal.className = "preview-modal";
  modal.innerHTML = `
    <div class="preview-content">
      <h3>معاينة: ${item.name}</h3>
      <pre class="preview-text">${item.content || "(لا يوجد محتوى)"}</pre>
      <button id="closePreview" style="margin-top:10px;padding:8px 16px;background:#3498db;color:white;border:none;border-radius:6px;cursor:pointer;">إغلاق</button>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById("closePreview").addEventListener("click", () => {
    document.body.removeChild(modal);
  });
}

// === قراءة جميع الملفات ===
async function readAllFiles(callback) {
  let pending = uploadedFiles.length;
  if (pending === 0) return callback();

  for (const item of uploadedFiles) {
    if (item.content !== null) {
      pending--;
      continue;
    }

    try {
      const arrayBuffer = await item.file.arrayBuffer();

      if (item.file.type === "text/plain") {
        item.content = new TextDecoder("utf-8").decode(new Uint8Array(arrayBuffer));
      } else if (item.file.type === "text/csv") {
        const text = new TextDecoder("utf-8").decode(new Uint8Array(arrayBuffer));
        const result = Papa.parse(text, { header: false });
        item.content = result.data.map(row => row.join("\t")).join("\n");
      } else if (item.file.type === "application/pdf") {
        const { pdfLib } = globalThis;
        const pdfDoc = await pdfLib.PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        item.content = pages.map((page, i) => `[صفحة ${i+1} من ${item.name}]\n`).join("\n");
      } else if (item.file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ arrayBuffer });
        item.content = result.value;
      }
    } catch (err) {
      item.content = `(خطأ في قراءة الملف: ${err.message})`;
      console.error(err);
    }

    pending--;
  }

  // انتظار انتهاء جميع القراءات
  const checkInterval = setInterval(() => {
    if (pending <= 0) {
      clearInterval(checkInterval);
      callback();
    }
  }, 100);
}

// === دمج الملفات ===
mergeButton.addEventListener("click", async () => {
  if (uploadedFiles.length === 0) {
    showStatus("يرجى رفع ملفات أولاً.", "error");
    return;
  }

  const format = outputFormat.value;
  const filename = outputFilename.value.trim() || "الملف_المدمج";

  showStatus("جاري معالجة الملفات...", "success");

  await readAllFiles(async () => {
    const allText = uploadedFiles
      .map(item => `=== بدء: ${item.name} ===\n\n${item.content || ""}\n\n`)
      .join("");

    if (format === "txt") {
      const blob = new Blob([allText], { type: "text/plain;charset=utf-8" });
      downloadBlob(blob, `${filename}.txt`);
    } else if (format === "pdf") {
      try {
        const { pdfLib } = globalThis;
        const pdfDoc = await pdfLib.PDFDocument.create();
        const font = await pdfDoc.embedFont(pdfLib.StandardFonts.Helvetica);
        const lines = allText.split("\n");
        const maxLineLength = 90;

        let page = pdfDoc.addPage();
        let { width, height } = page.getSize();
        let y = height - 50;

        for (const line of lines) {
          const chunks = chunkString(line, maxLineLength);
          for (const chunk of chunks) {
            if (y < 50) {
              page = pdfDoc.addPage();
              y = height - 50;
            }
            page.drawText(chunk, { x: 50, y, size: 12, font });
            y -= 16;
          }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        downloadBlob(blob, `${filename}.pdf`);
      } catch (err) {
        showStatus("فشل إنشاء ملف PDF.", "error");
        console.error(err);
      }
    }
  });
});

// === تجزئة النص ===
function chunkString(str, length) {
  const chunks = [];
  for (let i = 0; i < str.length; i += length) {
    chunks.push(str.slice(i, i + length));
  }
  return chunks;
}

// === تنزيل الملف ===
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus(`تم إنشاء الملف "${filename}" وبدأ التنزيل.`, "success");
}

// === تنسيق حجم الملف ===
function formatFileSize(bytes) {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "ك.ب", "م.ب", "ج.ب"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// === رسالة الحالة ===
function showStatus(msg, type) {
  statusMessage.textContent = msg;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove("hidden");
  setTimeout(() => {
    statusMessage.classList.add("hidden");
  }, 5000);
}

// === الوضع الليلي ===
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  darkModeToggle.textContent = document.body.classList.contains("dark-mode")
    ? "☀️ الوضع النهاري"
    : "🌙 الوضع الليلي";
});

// === التهيئة الأولية ===
outputFilename.value = `الملف_المدمج_${new Date().toLocaleDateString('ar-SA').replace(/\//g, '-')}`;