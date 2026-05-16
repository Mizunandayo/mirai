# server/export/qr_generator.py
"""Generates a QR code PNG (bytes) encoding the live demo URL."""



from __future__ import annotations
import io
import qrcode
from qrcode.image.pil import PilImage


def generate_qr(
    url: str,
    task_name: str = "Mirai Task",
    size: int = 400,
) -> bytes:
    """
    Returns a PNG QR code as raw bytes.

    :param url:       URL to encode (Vercel live demo link)
    :param task_name: Used as alt text / fallback
    :param size:      Target image size in pixels (square)
    """
    if not url:
        url = f"https://github.com/Mizunandayo/mirai — Task: {task_name}"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img: PilImage = qr.make_image(fill_color="black", back_color="white")


    # Resize to target
    img = img.resize((size, size))

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()