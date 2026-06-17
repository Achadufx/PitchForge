import { useState } from "react";

export default function DocumentUpload({ onComplete, plan }) {
  const [docs, setDocs] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const docLimit = plan === "free" ? 3 : 999;

  const handleFiles = async (fileList) => {
    const arr = Array.from(fileList);
    console.log(`📄 Attempting to upload ${arr.length} files`);
    
    if (docs.length + arr.length > docLimit) {
      setError(
        "You can upload up to " + docLimit + " documents on your current plan. You already have " + docs.length + "."
      );
      return;
    }
    
    // Filter valid file types
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    const validExts = [".pdf", ".docx", ".txt"];
    
    const validFiles = arr.filter(file => {
      const isValid = validTypes.includes(file.type) || validExts.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!isValid) {
        setError(`"${file.name}" is not supported. Only PDF, DOCX, and TXT files are allowed.`);
      }
      return isValid;
    });
    
    if (validFiles.length === 0) return;
    
    const newDocs = [];
    for (const file of validFiles) {
      try {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result.split(",")[1]);
          reader.readAsDataURL(file);
        });
        newDocs.push({
          name: file.name,
          base64,
          mimeType: file.type || "application/pdf",
          status: "ready",
        });
      } catch (err) {
        console.error(`Failed to read ${file.name}:`, err);
        setError(`Failed to read ${file.name}`);
      }
    }
    
    setDocs((prev) => {
      const updated = [...prev, ...newDocs];
      console.log(`✅ Added ${newDocs.length} files. Total: ${updated.length}`);
      return updated;
    });
    setError("");
  };

  const removeDoc = (i) =>
    setDocs((prev) => prev.filter((_, idx) => idx !== i));

  const analyze = async () => {
    if (docs.length === 0) return;
    setAnalyzing(true);
    setError("");

    try {
      setDocs((prev) => prev.map((d) => ({ ...d, status: "analyzing" })));

      const files = docs.map((doc) => ({
        name: doc.name,
        base64: doc.base64,
        mimeType: doc.mimeType,
      }));

      const res = await fetch("/api/analyze-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setDocs((prev) => prev.map((d) => ({ ...d, status: "done" })));
      onComplete(data.profile);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err.message);
      setDocs((prev) => prev.map((d) => ({ ...d, status: "ready" })));
    }
    setAnalyzing(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>
          Upload your startup documents
        </h3>
        <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
          PDF, DOCX, or TXT — pitch deck, whitepaper, executive summary, business plan.
          {plan === "free" && (
            <span style={{ color: "#f87171" }}> Free: up to 3 files.</span>
          )}
        </p>
      </div>
      
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => document.getElementById("doc-upload-input").click()}
        style={{
          border: "2px dashed #334155",
          borderRadius: 10,
          padding: "28px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: "#0a0f1e",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 13, marginBottom: 4 }}>
          Drop files here or click to browse
        </div>
        <div style={{ fontSize: 11, color: "#475569" }}>
          PDF · DOCX · TXT · Up to {docLimit} files
        </div>
        <input
          id="doc-upload-input"
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          style={{ display: "none" }}
          onChange={(e) => {
            console.log("File input changed, files:", e.target.files);
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
              // Reset the input so the same file can be uploaded again
              e.target.value = "";
            }
          }}
        />
      </div>
      
      {docs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {docs.map((doc, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <span style={{ fontSize: 16 }}>
                {doc.name.endsWith(".pdf") ? "📕" : doc.name.endsWith(".docx") ? "📘" : "📄"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#e2e8f0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: doc.status === "done" ? "#4ade80" : doc.status === "analyzing" ? "#a78bfa" : "#475569",
                  }}
                >
                  {doc.status === "done" ? "✓ Done" : doc.status === "analyzing" ? "⏳ Analyzing..." : "Ready"}
                </div>
              </div>
              {!analyzing && (
                <button
                  onClick={() => removeDoc(i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#475569",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: 2,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <p style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>
          ⚠ {error}
        </p>
      )}
      
      {docs.length > 0 && (
        <button
          onClick={analyze}
          disabled={analyzing}
          style={{
            width: "100%",
            padding: "11px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: analyzing ? "not-allowed" : "pointer",
            background: analyzing ? "#1e293b" : "#7c3aed",
            color: analyzing ? "#475569" : "#fff",
            border: "none",
          }}
        >
          {analyzing ? "⏳ Analyzing with AI..." : "Analyze Documents →"}
        </button>
      )}
    </div>
  );
}
