import { useEffect, useState } from "react";
import QRCode from "qrcode";

function QRModal({ vehicle, onClose }) {
  const [dataUrl, setDataUrl] = useState(null);
  const lookupUrl = `${window.location.origin}/?lookup=${encodeURIComponent(vehicle.vin)}`;

  useEffect(() => {
    QRCode.toDataURL(lookupUrl, { width: 280, margin: 2 }).then(setDataUrl);
  }, [lookupUrl]);

  return (
    <div className="quick-search-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{vehicle.license_plate}</h2>
        <p className="vehicle-card__meta">สแกนเพื่อเปิดประวัติรถคันนี้ทันที</p>
        {dataUrl && (
          <img src={dataUrl} alt="QR Code" className="qr-modal__image" />
        )}
        {dataUrl && (
          <a
            className="intake-submit qr-modal__download"
            href={dataUrl}
            download={`QR-${vehicle.license_plate}.png`}
          >
            ดาวน์โหลด QR (ไว้พิมพ์ติดรถ)
          </a>
        )}
        <button className="qr-modal__close" onClick={onClose}>
          ปิด
        </button>
      </div>
    </div>
  );
}

export default QRModal;
