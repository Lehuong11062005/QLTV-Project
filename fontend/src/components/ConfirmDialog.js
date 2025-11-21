import React, { useEffect } from "react";

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  // Lock scroll khi mở modal
  useEffect(() => {
    document.body.style.overflow = "hidden";

    // Thoát bằng phím ESC
    const handleEsc = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onCancel]);

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel} // click nền để tắt
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={stopPropagation} // tránh click vào nội dung bị đóng
        style={{
          background: "white",
          padding: "24px",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "420px",
          textAlign: "center",
          boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
          transform: "scale(1)",
          animation: "scaleIn 0.18s ease",
        }}
      >
        <p
          style={{
            marginBottom: "22px",
            fontSize: "17px",
            fontWeight: 500,
            color: "#333",
            lineHeight: "1.6",
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: "#16a34a",
              color: "white",
              border: "none",
              padding: "12px 0",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              transition: "0.2s",
            }}
          >
            Đồng ý
          </button>

          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "12px 0",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              transition: "0.2s",
            }}
          >
            Hủy
          </button>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes scaleIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
