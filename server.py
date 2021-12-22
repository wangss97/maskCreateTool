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

@app.route("/upload/artificialMask", methods = ["POST"])
def uploadArtiMask():
    data = request.get_json()
    name = data['name']
    base64_mask = data['mask']
    bytes_mask = base64_decode(base64_mask)
    mask = Image.open(BytesIO(bytes_mask))
    mask.save('./static/resource/masks_artificial/'+name)
    return make_response()

@app.route("/download/colorTransTable", methods = ["POST"])
def downloadColorTransTable():
    with open('./static/resource/colorTransTable.json','r',encoding='utf-8') as fp:
        file_content = fp.read()
    return make_response(file_content)

if __name__ == '__main__':
    app.run()
        