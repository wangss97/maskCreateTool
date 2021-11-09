from flask import *
from itsdangerous import base64_decode
from PIL import Image
from io import BytesIO
import threading

app = Flask(__name__)
lock = threading.Lock()

@app.route("/upload/mask", methods = ["POST"])
def uploadMask():
    data = request.get_json()
    name = data['name']
    base64_mask = data['mask']
    bytes_mask = base64_decode(base64_mask)
    mask = Image.open(BytesIO(bytes_mask))
    mask.save('./static/resource/masks/'+name)
    return make_response()


if __name__ == '__main__':
    app.run()