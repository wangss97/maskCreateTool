
class MaskCreate{
/* 	画布介绍：
	canvas:用于展示画面的canvas
	bCanvas:用于实际绘制的canvas，所有的绘制操作都在bCanvas上面完成，bCanvas不可见，bCanvas始终处于固定大小和固定位置，bCanvas画好的东西展示到canvas上
	使用这种方式可以快速的处理放缩和平移画布的功能，平移和放缩画布时不需要重绘bCanvas上所有的操作，只需要根据平移和放缩的参数将bCanvas绘制到canvas上就行了
	
	opacityCanvas，对bCanvas上的绘制内容进行透明度处理后的canvas，用于实现改变透明度的功能
	
	展示画布逻辑；
	1，清空canvs
	2，根据放缩和平移参数绘制初始image到canvas上
	3，根据放缩和平移参数绘制opacityCanvas（opacityCanvas由bCanvas进行透明度转后得到）到canvas上

	画直线逻辑:
	1，鼠标按下时记录起点，绑定鼠标移动事件，鼠标松开事件
	2，鼠标移动事件：（1）展示画布逻辑  （2）在canvas上直接绘制起点到当前鼠标位置的直线
	【由于鼠标移动事件中没有进行bCanvas的绘制，（1）展示画布逻辑 能够起到覆盖鼠标移动过程中上一个位置画下的直线的作用】
	3，鼠标松开事件：（1）解除绑定鼠标移动事件，鼠标松开事件  （2）根据起点和终点在bCanvas上绘制直线  （3）展示画布逻辑

	改变透明度逻辑（此功能实现的是对原图的绘图操作的透明度更改，不包括原图的透明度更改）：
	1，在所有的绘图操作之后（鼠标松开事件中），以及更高透明度操作之后，添加updateCanvas操作
	2，updataCanvas操作：（1）将bCanvas转换为像素值数组  （2）对像素值数组中的所有alpha通道值进行更改  （3）保存像素值数组到opacityCanvas上
	*/
    constructor(){
		this.index = null;
		// 当前绘制的图片原图
		this.image = null;

		// 原图宽
		this.iWidth = 0;
		// 原图高
        this.iHeight = 0;
		// 绘制窗口宽
        this.cWidth = 800;
		// 绘制窗口高
        this.cHeight = 800;
		// 绘制图的左上角在绘制窗口中的位置
        this.x = 0;
        this.y = 0;
		// 鼠标前一次点击的位置
		this.mousePrevX = 0;
		this.mousePrevY = 0;
		// 鼠标的悬浮位置（鼠标下辅助显示画笔大小的圆圈的位置，始终处于动态更新中）
		this.hoverX = 0;
		this.hoverY = 0;
		// 放缩比例
        this.scale = 1.0;
		this.maxScale = 5.0;
		this.minScale = 0.1;
		// 绘制线宽
		this.lineWidth = 10;
		// 不透明度
		this.opacity = 1.0;
        this.Nodes = {
            canvas: document.getElementById('maskCanvas'),
            bCanvas: document.getElementById('maskBCanvas'),
			opacityCanvas:null,
			opacityChangeInput: emt("opacityChangeInput"),
		}
        this.Arrays = {
			// 用于记录历史绘制操作的数组
            history:[],
        }
        this.Initial();
    };

    Initial = ()=>{
		this.Nodes.canvas.addEventListener('mousedown', this.CanvasMouseDown);
		this.Nodes.canvas.addEventListener('mousemove', this.CanvasMouseMoveCircle);
		this.Nodes.canvas.addEventListener('contextmenu', this.preventContextMenu);
		this.Nodes.canvas.addEventListener('wheel', this.CanvasWheel);
		emt('maskAnnotationSwitch').onclick = this.showHideCreateMaskAnnotation;
		emt('cancelBtn').onclick = win.nextImg;
		emt('okBtn').onclick = this.Save;
		opacityChangeInput.oninput = this.changeOpacity;
		let createMaskModalContent = emt('createMaskModalContent');
		createMaskModalContent.style.width = this.cWidth+'px';
		createMaskModalContent.style.height = this.cHeight+'px';
		createMaskModalContent.style.marginTop = -this.cHeight/2+'px';
		createMaskModalContent.style.marginLeft = -this.cWidth/2+'px';
		let canvas = this.Nodes.canvas;
		canvas.width = this.cWidth;
		canvas.height = this.cHeight;
 	};

    // 取image的x, y, width, height部分， 取全图可设置为0,0,width,height
    SetImage = (index, image, x, y, width, height, maskDrawHistory=null) =>{
		// 添加键盘事件
		document.addEventListener('keydown', this.CanvasKeyDown);
		// 清空上一张图的历史绘图记录
		this.Arrays.history = [];

        let canvas = this.Nodes.canvas;
        let bCanvas = this.Nodes.bCanvas;
        this.index = index;
        this.iWidth = width;
        this.iHeight = height;
		// 初始图片居中放置
        this.x = (this.cWidth - this.iWidth)/2;
        this.y = (this.cHeight - this.iHeight)/2;
        this.scale = 1.0;
		this.hoverX = 0;
		this.hoverY = 0;

		// 重置透明度
		// this.Nodes.opacityChangeInput.value = 100
		// this.opacity = 1.0

		// 初始化bCanvas
        bCanvas.width = this.iWidth;
        bCanvas.height = this.iHeight;
        let bCtx = bCanvas.getContext('2d');
        bCtx.clearRect(0,0, this.iWidth, this.iHeight);
		// 获得x,y,width,height区域的image，此处bCanvas是个工具人
		bCtx.drawImage(image, x, y, this.iWidth, this.iHeight, 0,0,this.iWidth, this.iHeight)
		this.image = new Image();
		this.image.src = bCanvas.toDataURL('image/png');
        bCtx.clearRect(0,0, this.iWidth, this.iHeight);
		// 初始化opacityCanvas，opacityCanvas是bCanvas改变透明度后的结果
		this.updateOpacityCanvas();
		// 如果有，重绘历史
		if(maskDrawHistory){
			this.Arrays.history = maskDrawHistory;
			this.paintShowCanvasFromHistory();
		}
		// 在图片加载好后画canvas
		this.image.onload = (event)=>{
			this.paintShowCanvas();
		};
	};


	drawLine = (canvas, prevX, prevY, x, y, lineWidth=null) => {
		let ctx = canvas.getContext('2d');
		ctx.beginPath();
		ctx.globalCompositeOperation = "source-over"
		ctx.lineWidth = lineWidth ? lineWidth : this.lineWidth;
		ctx.lineCap = "round";
		ctx.strokeStyle = 'rgba(255,255,255,1.0)';
		ctx.moveTo(prevX, prevY);
		ctx.lineTo(x, y);
		ctx.stroke();
	}

	drawCircle  = (canvas, x, y, radius) => {
		let ctx = canvas.getContext('2d');
		ctx.beginPath();
		ctx.globalCompositeOperation = "xor";
		ctx.strokeStyle = 'rgb(0,0,0)';
		ctx.lineWidth = (this.lineWidth*0.95)*this.scale;
		ctx.lineCap = "butt";
		ctx.arc(x,y, radius, 0, 2*Math.PI);
		ctx.stroke();
	}

	// 从bCanvas上把图片绘制到展示canvas上
	paintShowCanvas = ()=>{
		// 1，绘制原图  2，绘制bCanvas到展示canvas上 (opacityCanvas为bCanvas改变了透明度后的画布)
		let ctx = this.Nodes.canvas.getContext('2d');
		ctx.clearRect(0,0,this.cWidth, this.cHeight);
		ctx.drawImage(this.image, -this.x/this.scale, -this.y/this.scale, this.cWidth/this.scale, this.cHeight/this.scale, 0,0,this.cWidth, this.cHeight);

		let opacityCanvas = this.Nodes.opacityCanvas ? this.Nodes.opacityCanvas:this.Nodes.bCanvas;
		ctx.drawImage(opacityCanvas, -this.x/this.scale, -this.y/this.scale, this.cWidth/this.scale, this.cHeight/this.scale, 0,0,this.cWidth, this.cHeight);
	};

	paintShowCanvasFromHistory = () =>{
		let _self = this;
		let bCanvas = this.Nodes.bCanvas;
		let bCtx = this.Nodes.bCanvas.getContext('2d');
		
		// 根据历史记录重画bCanvas
		bCtx.beginPath();
		bCtx.clearRect(0,0, this.iWidth, this.iHeight);

		this.Arrays.history.forEach(function(element){
			_self.drawLine(bCanvas, element.content[0].x,element.content[0].y,element.content[1].x,element.content[1].y, element.lineWidth);
		});
		this.updateOpacityCanvas();
		this.paintShowCanvas();
	};

	// 根据bCanvas上的内容，创建一个改变了opacity的canvas
	updateOpacityCanvas = ()=>{
		// 获得bCanvas的内容
		let bCanvas = this.Nodes.bCanvas;
		let bCtx = bCanvas.getContext('2d');
		let imageData = bCtx.getImageData(0,0,this.iWidth, this.iHeight);
		// 进行透明度更改
		this.opacityChangeFunc(imageData)
		// 赋值给中间canvas并返回
        let tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = this.iWidth;
        tmpCanvas.height = this.iHeight;
        let tmpCtx = tmpCanvas.getContext('2d');
		tmpCtx.putImageData(imageData, 0, 0);
		this.Nodes.opacityCanvas = tmpCanvas;
	}

	opacityChangeFunc = (imageData)=>{

		// for(let i = 0;i<imageData.width;i++){
		// 	for (let j = 0;j<imageData.height;j++){
		// 		imageData.data[idx(i, j, 3)] = imageData.data[idx(i, j, 3)] * this.opacity;
		// 	}
		// }
		for(let i = 0; i<imageData.data.length; i+=4){
			imageData.data[i+3] = imageData.data[i+3]*this.opacity;
		}
	}
    
    getMask = ()=>{
        let _self = this;
        let canvas = document.createElement('canvas');
        canvas.width = this.iWidth;
        canvas.height = this.iHeight;
        let ctx = canvas.getContext('2d')
        ctx.clearRect(0,0,this.iWidth, this.iHeight);
		ctx.fillStyle = 'black';
        ctx.fillRect(0,0,this.iWidth, this.iHeight);
        this.Arrays.history.forEach(
            function(element){
			    _self.drawLine(canvas, element.content[0].x,element.content[0].y,element.content[1].x,element.content[1].y, element.lineWidth, 1.0);
            }
        );
		let base64Mask = canvas.toDataURL('image/png');
		base64Mask = base64Mask.replace('data:image/png;base64,','');
		return base64Mask;
    }

	// 替换X坐标，保证坐标在图片内
	XPointReplace = (x)=>{
		if (x < this.x){
			x = this.x
		}else if(x > this.x + this.iWidth * this.scale){
			x = this.x + this.iWidth * this.scale
		}
		return x;
	};
	// 替换Y坐标，保证坐标在图片内
	YPointReplace = (y)=>{
		if (y < this.y){
			y = this.y
		}else if(y > this.y + this.iHeight * this.scale){
			y = this.y + this.iHeight * this.scale
		}
		return y;
	}

	// 显示坐标到原始坐标的转换
	disToOri = (x, y) => {
		let oriX = (x - this.x)/this.scale;
		let oriY = (y - this.y)/this.scale;
		return [oriX, oriY];
	}

	// ***************************************************  canvas事件开始
	CanvasMouseDown = (event)=>{
		if (event.button === 0){
			this.mousePrevX = this.XPointReplace(event.offsetX);
			this.mousePrevY = this.YPointReplace(event.offsetY);
			this.Nodes.canvas.removeEventListener('mousemove', this.CanvasMouseMoveCircle);
			this.Nodes.canvas.addEventListener('mousemove', this.CanvasMouseMoveDrawLine);
			this.Nodes.canvas.addEventListener('mouseup', this.CanvasMouseUpDrawLine);
		}else if (event.button === 2){
			this.mousePrevX = event.offsetX;
			this.mousePrevY = event.offsetY;
			this.Nodes.canvas.addEventListener('mousemove', this.CanvasMouseMoveDrag);
			this.Nodes.canvas.addEventListener('mouseup', this.CanvasMouseUpDrag);
		}
	};

	CanvasMouseMoveDrawLine = (event) => {
		let x = this.XPointReplace(event.offsetX);
		let y = this.YPointReplace(event.offsetY);
		this.paintShowCanvas();
		this.drawLine(this.Nodes.canvas, this.mousePrevX, this.mousePrevY, x, y, this.lineWidth*this.scale);
	};

	CanvasMouseUpDrawLine = (event) => {
		let prePoint = this.disToOri(this.mousePrevX, this.mousePrevY);
		let point = this.disToOri(this.XPointReplace(event.offsetX), this.YPointReplace(event.offsetY))
		this.drawLine(this.Nodes.bCanvas, prePoint[0], prePoint[1], point[0], point[1], this.lineWidth);
		this.updateOpacityCanvas();
		this.paintShowCanvas();
		this.RecordHistory(prePoint, point);
		this.Nodes.canvas.removeEventListener('mousemove', this.CanvasMouseMoveDrawLine);
		this.Nodes.canvas.removeEventListener('mouseup', this.CanvasMouseUpDrawLine);
		this.Nodes.canvas.addEventListener('mousemove', this.CanvasMouseMoveCircle);
	};

	// 显示画笔大小的圆框
	CanvasMouseMoveCircle = (event) => {
		let x = event.offsetX;
		let y = event.offsetY;
		this.hoverX = x;
		this.hoverY = y;
		this.paintShowCanvas();
		this.drawCircle(this.Nodes.canvas, x, y, 1.0);
	}

	// 快捷键函数
	CanvasKeyDown = (event) => {
		console.log(event.key);
		if (event.key === '['){
			this.lineWidth = this.lineWidth > 1 ? this.lineWidth - 1: this.lineWidth;
			this.paintShowCanvas();
			this.drawCircle(this.Nodes.canvas, this.hoverX, this.hoverY, 1.0);
		}
		if (event.key === ']'){
			this.lineWidth = this.lineWidth < 50 ? this.lineWidth + 1: this.lineWidth;
			this.paintShowCanvas();
			this.drawCircle(this.Nodes.canvas, this.hoverX, this.hoverY, 1.0);
		}
		if (event.ctrlKey && event.key==='z' ){
			this.RollBack();
		}
        if (event.key === 'Enter'){
            this.Save();
        }
		if (event.key === 'Escape'){
			this.Cancle();
		}
	}

	// 右键拖拽
	CanvasMouseMoveDrag = (event)=>{
		let offsetX = event.offsetX - this.mousePrevX;
		let offsetY = event.offsetY - this.mousePrevY;
		this.mousePrevX = event.offsetX;
		this.mousePrevY = event.offsetY;
		this.x = this.x + offsetX;
		this.y = this.y + offsetY;
		this.x = this.x < 20-this.iWidth*this.scale ? 20-this.iWidth*this.scale : this.x;
		this.x = this.x > this.cWidth - 20 ? this.cWidth - 20 : this.x;
		this.y = this.y < 20-this.iHeight*this.scale ? 20-this.iHeight*this.scale : this.y;
		this.y = this.y > this.cHeight - 20 ? this.cHeight - 20 : this.y;
		this.paintShowCanvas();
	}
	CanvasMouseUpDrag = (event) =>{
		this.Nodes.canvas.removeEventListener('mousemove', this.CanvasMouseMoveDrag);
		this.Nodes.canvas.removeEventListener('mouseup', this.CanvasMouseUpDrag);
	}

	// 滚轮放缩
	CanvasWheel = (event)=>{
		let newScale = this.scale * (1 + (event.deltaY>0? -0.1:0.1));
		newScale = newScale > this.maxScale ? this.maxScale:newScale;
		newScale = newScale < this.minScale ? this.minScale:newScale;
		let x = event.offsetX;
		let y = event.offsetY;
		this.x = x - (x - this.x)/this.scale * newScale;
		this.y = y - (y - this.y)/this.scale * newScale;
		this.scale = newScale;
		this.paintShowCanvas();
	}

	changeOpacity = (event) => {
		this.opacity = event.target.value/100.0;
		this.updateOpacityCanvas();
		this.paintShowCanvas();
	}

	showHideCreateMaskAnnotation = (event)=>{
		let ano = emt("createMaskAnnotation");
		if (ano.style.display=='none'){ano.style.display='block';}
		else{ano.style.display='none';}
	}
	// ***************************************************  canvas事件结束

	RecordHistory = (pointSt, pointEd) => {
		this.Arrays.history.push({
			contentType:'line',
			content:[{x:pointSt[0], y:pointSt[1]},{x:pointEd[0],y:pointEd[1]}],
			lineWidth:this.lineWidth,
		});
	}

	RollBack = () => {
		if (this.Arrays.history.length == 0){return;}
		this.Arrays.history.pop();
		this.paintShowCanvasFromHistory();
	}


    // 根据实际情况，填写自己的保存功能
    Save = (event) =>{
        let mask = this.getMask();
		win.saveMask(mask);
	}

	Cancle = () =>{
		let createMaskModal = document.getElementById('createMaskModal');
		createMaskModal.style.display='none';
		document.removeEventListener('keydown', this.CanvasKeyDown);
	}

	// 阻止默认的右键菜单
	preventContextMenu = (event)=>{
		event.preventDefault();
	}
}


