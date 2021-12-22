let canvas = document.getElementById("myCanvas")

let picWidth = 256
let picHeight = 512
let lineWidthMin = 3
let lineWidthMax = 8
let lineLengthMin = 30
let lineLengthMax = 128
let angleMin = -Math.PI / 2
let angleMax = Math.PI / 2
let maskNum = 260

canvas.width = picWidth
canvas.height = picHeight


let ctx = canvas.getContext('2d')


emt('btn').onclick = ()=>{

    maskNum = parseInt(emt('maskNum').value);
    // ctx.clearRect(0,0,picWidth, picHeight)
    // ctx.beginPath()
    // ctx.moveTo(0,0)
    // ctx.lineTo(10,10)
    // ctx.stroke()
    // let base64Mask = canvas.toDataURL('image/png');
    // base64Mask = base64Mask.replace('data:image/png;base64,','');

    // ajax("post", "/upload/mask", false, JSON.stringify({"name":"test.png", "mask":base64Mask}), this.nextImg)


     for (let i = 0; i < maskNum; i++){
        // 制作随机掩码，指定线宽，线长，角度，起点
        // 5 - 10

        let lineWidth = Math.random()*(lineWidthMax-lineWidthMin) + lineWidthMin
        // 10 - 30
        let lineLength = Math.random()*(lineLengthMax-lineLengthMin) + lineWidthMin
        let x = Math.random() * picWidth
        let y = Math.random() * picHeight
        let angle = Math.random() * (angleMax - angleMin) + angleMin
        let xEd = x + lineLength*Math.cos(angle)
        let yEd = y + lineLength*Math.sin(angle)

        
        ctx.beginPath()
        ctx.fillStylle="rgb(0,0,0)"
        ctx.fillRect(0,0,canvas.width, canvas.height)
        ctx.beginPath()
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgb(255,255,255)"
        ctx.lineWidth = lineWidth
        ctx.moveTo(x,y)
        ctx.lineTo(xEd, yEd)
        ctx.stroke()

        let maskName = Math.floor(x)+'_'+Math.floor(y)+'_'+Math.floor(lineWidth)+'_'+Math.floor(lineLength)+'_'+angle.toFixed(2)+'.png'
        let base64Mask = canvas.toDataURL('image/png');
        base64Mask = base64Mask.replace('data:image/png;base64,','');

        ajax("post", "/upload/artificialMask", false, JSON.stringify({"name":maskName, "mask":base64Mask}), this.nextImg)
    }
}

function ajax(method, url, asynFlag, send_data, recallFun){
	let xhttp = new XMLHttpRequest();
	xhttp.open(method, url, asynFlag);
	xhttp.setRequestHeader('Content-type', 'application/json');
	xhttp.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			if(recallFun) recallFun(this);
		}
	}
	send_data ? xhttp.send(send_data):xhttp.send();
}

function emt(id){
    return document.getElementById(id);
}