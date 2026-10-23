import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validate(file) {
  if (!ALLOWED.includes(file.type)) {
    return "Only image files are allowed (JPEG, PNG, WebP, GIF).";
  }
  if (file.size > MAX_SIZE) {
    return "File is too large. The maximum size is 5MB.";
  }
  return null;
}

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function chooseFile(candidate) {
    setError("");
    setProgress(0);
    setUploadedUrl("");

    if (!candidate) return;

    const validationError = validate(candidate);
    if (validationError) {
      setFile(null);
      setPreview(null);
      setError(validationError);
      return;
    }

    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  function handleFileChange(event) {
    chooseFile(event.target.files[0]);
    // Allow choosing the same file again after an error or completed upload.
    event.target.value = "";
  }

  async function upload() {
    if (!file || isUploading) return;

    const formData = new FormData();
    formData.append("avatar", file);
    setError("");
    setProgress(0);
    setUploadedUrl("");
    setIsUploading(true);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(Math.min(100, Math.max(0, percent)));
          }
        },
      });
      setProgress(100);
      const url = response.data.url;
      setUploadedUrl(
        url ? new URL(url, response.config.baseURL || apiClient.defaults.baseURL).href : "",
      );
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          uploadError.response?.data?.message ||
          "Upload failed. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="uploader" aria-label="Avatar uploader">
      <div
        className={isDragging ? "drop-zone dragging" : "drop-zone"}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="Choose an image or drop one here"
      >
        <p>{isDragging ? "Drop to upload" : "Drag an image here, or click to choose"}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={handleFileChange}
        />
      </div>

      {file && (
        <p className="file-name" aria-live="polite">
          Selected: {file.name}
        </p>
      )}

      {preview && <img src={preview} alt="Selected avatar preview" className="preview" />}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button onClick={upload} disabled={!file || isUploading}>
        {isUploading ? "Uploading…" : "Upload"}
      </button>

      {(isUploading || progress > 0) && (
        <div className="upload-progress" aria-live="polite">
          <div
            className="bar"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{isUploading ? `Uploading ${file.name} — ${progress}%` : `Upload complete — ${progress}%`}</p>
        </div>
      )}

      {uploadedUrl && (
        <p className="upload-success" role="status">
          Uploaded successfully: <a href={uploadedUrl}>{uploadedUrl}</a>
        </p>
      )}
    </section>
  );
}
