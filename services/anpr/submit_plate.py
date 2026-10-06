"""Send a detected plate to the parking API for adapter testing.

Pass text from an OCR engine after recognition. This script deliberately does not
pretend to recognize plates; configure an OCR model before connecting a camera.
"""

import os
import sys

import requests


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python submit_plate.py LICENSE_PLATE VEHICLE_TYPE")

    api_url = os.environ.get("PARKING_API_URL", "http://localhost:3000")
    secret = os.environ.get("ANPR_GATE_SECRET")
    if not secret:
        raise SystemExit("Set ANPR_GATE_SECRET before submitting a plate")

    response = requests.post(
        f"{api_url.rstrip('/')}/api/anpr/entry",
        headers={"x-anpr-gate-secret": secret},
        json={"licensePlate": sys.argv[1], "vehicleType": sys.argv[2]},
        timeout=10,
    )
    print(response.status_code, response.text)
    response.raise_for_status()


if __name__ == "__main__":
    main()
