
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
		this.minLineWidth = 1;
		this.maxLineWidth = 50;
		this.color = 'rgb(255,255,255)';
		this.defaultColor = 'rgb(255,255,255)';
		// 不透明度
		this.opacity = 1.0;
		this.drawMode = 'brush';
        this.Nodes = {
            canvas: document.getElementById('maskCanvas'),
            bCanvas: document.getElementById('maskBCanvas'),
			opacityCanvas:null,
			opacityChangeInput: emt("opacityChangeInput"),
			brushSizeChangeInput: emt("brushSizeChangeInput"),
			typeButtons: null
		}
        this.Arrays = {
			// 用于记录历史绘制操作的数组
            history:[],
			eraserPoints:[],
			defectType:[],
			colorTransTable:{}
        }
		// 用于记录history的栈顶指针
		this.historyPointer = 0
		// 类型颜色转换表
		this.colorTransTable = null;
		// 一幅黑白图片，其中白色区域为选定的缺陷区域，可以用于选中缺陷轮廓线的绘制，以及选中缺陷区域的类型转换
		this.contourMask = null;
		// 缺陷类型转换时，前一个类型
		this.preDefectType = null;
        this.Initial();
    };

    Initial = ()=>{
		this.addEvent(this.Nodes.canvas, 'mousedown', this.CanvasMouseDown);
		this.addEvent(this.Nodes.canvas, 'mousemove', this.CanvasMouseMoveCircle);
		this.addEvent(this.Nodes.canvas, 'contextmenu', this.preventContextMenu);
		this.addEvent(this.Nodes.canvas, 'wheel', this.CanvasWheel);

		emt('maskAnnotationSwitch').onclick = this.showHideCreateMaskAnnotation;
		emt('cancelBtn').onclick = win.nextImg;
		emt('okBtn').onclick = this.Save;
		emt('brushOrEraserFlag').onclick = (event)=>{
			let parent = emt("brushOrEraserFlag").parentNode
			if (parent.className != "active"){
				emt('drawOrGrabFlag').parentNode.className = "";
				parent.className = "active";

				this.Nodes.canvas.style.cursor = "crosshair";
				this.resotreEvent(this.Nodes.canvas);
				this.contourMask = null;

			}else{
				this.drawMode = this.drawMode === 'eraser' ? 'brush':'eraser';
				emt('brushOrEraserFlag').className = emt('brushOrEraserFlag').className === 'icon-pencil'? 'icon-eraser':'icon-pencil';
				parent.className = "active";
			}
			
		}
		emt("drawOrGrabFlag").onclick = (event)=>{
			let parent = emt('drawOrGrabFlag').parentNode;
			if(parent.className != "active"){
				parent.className = "active";
				emt("brushOrEraserFlag").parentNode.className = "";

				this.Nodes.canvas.style.cursor = "default";
				this.saveAndClearEvent(this.Nodes.canvas);
				this.addEvent(this.Nodes.canvas,"mousedown",this.CanvasMouseDownGrab);
			}

		}
		opacityChangeInput.oninput = this.changeOpacity;
		brushSizeChangeInput.oninput = this.changeBrushSize;
		let createMaskModalContent = emt('createMaskModalContent');
		createMaskModalContent.style.width = this.cWidth+'px';
		createMaskModalContent.style.height = this.cHeight+'px';
		createMaskModalContent.style.marginTop = -this.cHeight/2+'px';
		createMaskModalContent.style.marginLeft = -this.cWidth/2+'px';
		let canvas = this.Nodes.canvas;
		canvas.width = this.cWidth;
		canvas.height = this.cHeight;

		this.createTypeButton();
 	};

    // 取image的x, y, width, height部分， 取全图可设置为0,0,width,height
    SetImage = (index, image, x, y, width, height, maskDrawHistory=null) =>{
		// 显示画图板
		let createMaskModal = document.getElementById('createMaskModal');
		createMaskModal.style.display='block';
		
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


	drawLine = (ctx, prevX, prevY, x, y, lineWidth=null, color=null) => {
		ctx.beginPath();
		ctx.globalCompositeOperation = "source-over"
		ctx.lineWidth = lineWidth ? lineWidth : this.lineWidth;
		ctx.lineCap = "round";
		ctx.strokeStyle = color ? color : this.color;
		ctx.moveTo(prevX, prevY);
		ctx.lineTo(x, y);
		ctx.stroke();
	}

	drawCircle  = (ctx, x, y, radius = null, color=null) => {
		ctx.beginPath();
		// ctx.globalCompositeOperation = "xor";
		ctx.strokeStyle = color ? color:this.color;
		ctx.lineWidth = 1
		radius = radius ?  radius : 0.5*this.lineWidth*this.scale;
		ctx.lineCap = "butt";
		ctx.arc(x,y, radius, 0, 2*Math.PI);
		ctx.stroke();
	}

	eraserFunc = (ctx, x, y, lineWidth = null)=>{
		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = 1;
		lineWidth = lineWidth ? this.lineWidth:lineWidth;
		ctx.arc(x, y, 0.5*this.lineWidth, 0, 2*Math.PI);
		ctx.clip();
		ctx.clearRect(0,0,this.iWidth, this.iHeight);
		ctx.restore();
	}

	// 获得与给定像素值最接近的缺陷类型像素值
	// 绘画时，画笔边沿的像素会被平滑成不是画笔像素值
	getNearestColor = (r,g,b)=>{
	
		let minDistance = 100000;
		let color = null
		for (let key in this.colorTransTable){
			let distance = Math.sqrt(Math.pow(r-this.colorTransTable[key].R,2)+Math.pow(g-this.colorTransTable[key].G,2)+Math.pow(b-this.colorTransTable[key].B,2));
			if (distance < minDistance){
				minDistance = distance;
				color = [this.colorTransTable[key].R,this.colorTransTable[key].G,this.colorTransTable[key].B]
			}
		}
		return color
	}

	createTypeButton = ()=>{
		let self = this;
		ajax("post", "/download/colorTransTable", false, "", (xhttp)=>{
			let colorTransTable = JSON.parse(xhttp.responseText)
			this.colorTransTable = colorTransTable
			let typeButtonContainer = emt("typeButtonContainer");

			for(let key in colorTransTable){
				this.Arrays.defectType.push(key);
				this.Arrays.colorTransTable[key] = 'rgb('+colorTransTable[key].R+','+colorTransTable[key].G+','+colorTransTable[key].B+')';
			}

			this.Arrays.defectType.forEach((element, idx)=>{
				let button = document.createElement("button");
				button.textContent = element;
				button.style.border = "1px solid"
				button.style.margin = "5px auto";
				button.style.display = "block";
				button.style.width = "80%";
	
				button.style.color = this.Arrays.colorTransTable[element];
				typeButtonContainer.appendChild(button);
			})

			let buttons = typeButtonContainer.querySelectorAll('button');
			buttons.forEach((element, idx)=>{
				element.onclick = ()=>{
					self.color = self.Arrays.colorTransTable[element.innerText];
					buttons.forEach((_element)=>{
						_element.style.background='rgb(239,239,239)';
						_element.style.color = self.Arrays.colorTransTable[_element.innerText];
					})
					element.style.background = self.Arrays.colorTransTable[element.innerText];
					element.style.color = 'black';

					// 缺陷类型转换
					if (self.contourMask != null){
						let defectType = element.innerText
						// 转换类型相同时，什么都不做
						if(self.preDefectType == defectType){
							return
						}
						// 1，修改bCanvas上的缺陷类型
						let bCtx = self.Nodes.bCanvas.getContext('2d')
						self.changeDefectType(bCtx, self.contourMask, colorTransTable[defectType].R,colorTransTable[defectType].G,colorTransTable[defectType].B)
						self.updateOpacityCanvas()
						
						// 2，修改展示canvas上的缺陷类型
						self.paintShowCanvas()
						self.paintDefectContour()

						// 记录历史
						this.RecordHistory(
							{
								"contentType":"colorChange",
								"srcColor":self.colorTransTable[self.preDefectType],
								"dstColor":self.colorTransTable[defectType],
								"dstColorR":colorTransTable[defectType].R,
								"dstColorG":colorTransTable[defectType].G,
								"dstColorB":colorTransTable[defectType].B,
								"area":new cv.Mat(this.contourMask)
							}
						)
					}
				}
			})
		})
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
		let bCtx = this.Nodes.bCanvas.getContext('2d');
		
		// 根据历史记录重画bCanvas
		this.paintShowCanvasFromHistoryFunc(bCtx, this.Arrays.history)

		this.updateOpacityCanvas();
		this.paintShowCanvas();
	};

	paintShowCanvasFromHistoryFunc = (ctx, history)=>{
		let _self = this;
		ctx.beginPath();
		ctx.clearRect(0,0, this.iWidth, this.iHeight);

		history.forEach((element,idx)=>{
			if(idx >= this.historyPointer){
				return
			}
			if(element.contentType === 'brush'){
				_self.drawLine(ctx, element.content[0].x,element.content[0].y,element.content[1].x,element.content[1].y, element.lineWidth,element.color);
			}else if (element.contentType === 'eraser'){
				element.content.forEach((point)=>{
					_self.eraserFunc(ctx, point.x,point.y, element.lineWidth);
				})
			}else if (element.contentType === 'colorChange'){
				_self.changeDefectType(ctx, element.area, element.dstColorR,element.dstColorG,element.dstColorB)
			}
		});
	}

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

	changeDefectType = (ctx, contourMask, dstR, dstG, dstB)=>{
		let self = this
		let imageData = ctx.getImageData(0,0,self.iWidth, self.iHeight)

		for (let i = 0; i<imageData.height; i++){
			for (let j = 0; j<imageData.width; j++){
				if(contourMask.data[i*contourMask.cols*contourMask.channels()+j*contourMask.channels()] == 255){
					// console.log(colorTransTable[element.innerText].R,colorTransTable[element.innerText].G,colorTransTable[element.innerText].B)
					imageData.data[i*imageData.width*4 + j*4] = dstR;
					imageData.data[i*imageData.width*4 + j*4+1] = dstG;
					imageData.data[i*imageData.width*4 + j*4+2] = dstB;
					imageData.data[i*imageData.width*4 + j*4+3] = 255;
				}
			}
		}
		ctx.putImageData(imageData,0,0)
	}

	paintDefectContour = ()=>{
		let contours = new cv.MatVector()
		let hierarchy = new cv.Mat()
		cv.findContours(this.contourMask, contours, hierarchy, cv.RETR_TREE,cv.CHAIN_APPROX_NONE)
		this.paintShowCanvas()
		for(let cntIdx = 0; cntIdx<contours.size(); cntIdx++){
			let contour = contours.get(cntIdx)
			for(let i = 0; i<contour.rows;i++){
				this.drawCircle(this.Nodes.canvas.getContext('2d'),
					this.oriXToDisX(contour.data32S[i*contour.cols*contour.channels() + 0*contour.channels()]),
					this.oriYToDisY(contour.data32S[i*contour.cols*contour.channels() + 0*contour.channels()+1]),
					1,
					"rgb(255,255,0)"
				)
			}
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
		
		// this.paintShowCanvasFromHistoryFunc(ctx, this.Arrays.history)
		
		let imageData = this.Nodes.bCanvas.getContext('2d').getImageData(0,0,this.iWidth, this.iHeight);
		// 把透明像素变成黑色像素
		for(let i = 0; i<imageData.data.length; i+=4){
			if(imageData.data[i+3]===0){
				imageData.data[i+3] = 255;
			}
		}
		let unique = {}
		let height = imageData.height
		let width = imageData.width
		for(let i = 0;i<height; i++){
			for(let j = 0;j<width; j++){
				let r = imageData.data[i*width*4 + j*4]
				let g = imageData.data[i*width*4 + j*4 +1]
				let b = imageData.data[i*width*4 + j*4 +2]
				// 背景像素不处理
				if(r==0 && g==0 && b==0){
					continue
				}
				if (!unique[r+','+g+','+b]){
					let nearestColor = this.getNearestColor(r,g,b)
					unique[r+','+g+','+b] = nearestColor
				}
				// 边沿像素变成非平滑后的
				imageData.data[i*width*4 + j*4] = unique[r+','+g+','+b][0]
				imageData.data[i*width*4 + j*4 +1] = unique[r+','+g+','+b][1]
				imageData.data[i*width*4 + j*4 +2] = unique[r+','+g+','+b][2]
			}
		}
		ctx.putImageData(imageData, 0, 0);
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
	// 原始坐标到显示坐标的转换
	oriXToDisX = (x) => {
		let disX = x*this.scale + this.x
		return disX;
	}
	oriYToDisY = (y) => {
		let disY = y*this.scale + this.y
		return disY;
	}
	// ***************************************************  canvas事件开始
	CanvasMouseDown = (event)=>{
		if (event.button === 0){
			this.mousePrevX = this.XPointReplace(event.offsetX);
			this.mousePrevY = this.YPointReplace(event.offsetY);
			if (this.drawMode === 'brush'){
				this.removeEvent(this.Nodes.canvas,'mousemove', this.CanvasMouseMoveCircle);
				this.addEvent(this.Nodes.canvas,'mousemove', this.CanvasMouseMoveDrawLine);
				this.addEvent(this.Nodes.canvas,'mouseup', this.CanvasMouseUpDrawLine);
			}else if (this.drawMode === 'eraser'){
				this.Arrays.eraserPoints.splice(0, this.Arrays.eraserPoints.length);
				this.removeEvent(this.Nodes.canvas,'mousemove', this.CanvasMouseMoveCircle);
				this.addEvent(this.Nodes.canvas,'mousemove', this.CanvasMouseMoveEraser);
				this.addEvent(this.Nodes.canvas,'mouseup', this.CanvasMouseUpEraser);
			}
		}else if (event.button === 2){
			this.mousePrevX = event.offsetX;
			this.mousePrevY = event.offsetY;
			this.addEvent(this.Nodes.canvas,'mousemove', this.CanvasMouseMoveDrag);
			this.addEvent(this.Nodes.canvas,'mouseup', this.CanvasMouseUpDrag);
		}
	};

	CanvasMouseDownGrab = (event)=>{
		if (event.button === 0){
			let point = this.disToOri(this.XPointReplace(event.offsetX),this.YPointReplace(event.offsetY))
			point = [parseInt(point[0]),parseInt(point[1])]
			let image = cv.imread(this.Nodes.bCanvas)
			let r = this.getPixel(image, point[1],point[0],0)
			let g = this.getPixel(image, point[1],point[0],1)
			let b = this.getPixel(image, point[1],point[0],2)
			// 如果点击到了背景，直接结束
			if (r==0 && g==0 && b==0){
				return
			}
			let selectColor = this.getNearestColor(r,g,b)

			let unique = {}
			// 做二值化，选中的像素颜色是白色，其它所有像素是黑色
			for(let i =0; i< image.rows; i++){
				for (let j = 0; j<image.cols;j++){
					let r = this.getPixel(image, i,j,0)
					let g = this.getPixel(image, i,j,1)
					let b = this.getPixel(image, i,j,2)
					let color;
					if(unique[r+','+g+','+b]){
						color = unique[r+','+g+','+b]
					}else{
						color = this.getNearestColor(r,g,b)
						unique[r+','+g+','+b] = color
					}
					if(color[0]==selectColor[0] && color[1]==selectColor[1] && color[2]==selectColor[2]){
						this.setPixel(image, i, j, 255, 0)
						this.setPixel(image, i, j, 255, 1)
						this.setPixel(image, i, j, 255, 2)
					}else{
						this.setPixel(image, i, j, 0, 0)
						this.setPixel(image, i, j, 0, 1)
						this.setPixel(image, i, j, 0, 2)
					}
				}
			}
			cv.cvtColor(image, image, cv.COLOR_RGB2GRAY);

			// 求联通区域，点击位置在的联通区域为白色，其它所有地方为黑色，做二值化
			let labels = new cv.Mat()
			let cnt = cv.connectedComponents(image,labels)

			let componentId = labels.data32S[point[1]*labels.cols*labels.channels() + point[0]*labels.channels()]
			for(let i =0; i< labels.rows; i++){
				for (let j = 0; j<labels.cols;j++){
					if(labels.data32S[i*labels.cols*labels.channels() + j*labels.channels()] === componentId){
						this.setPixel(image, i, j, 255)
					}else{
						this.setPixel(image, i, j, 0)
					}
				}
			}
			this.contourMask = image

			// 获得轮廓
			// 画轮廓
			this.paintDefectContour()

			// 修改选中的typeButton
			let defectType = null
			for (let key in this.Arrays.colorTransTable){
				if(this.Arrays.colorTransTable[key] == "rgb("+selectColor[0]+","+selectColor[1]+","+selectColor[2]+")"){
					defectType = key
					break
				}
			}

			let typeButtonContainer = emt("typeButtonContainer")
			let buttons = typeButtonContainer.querySelectorAll('button')
			buttons.forEach((element, idx)=>{
				// console.log(element)
				if(element.innerText == defectType){
					this.preDefectType = defectType
					element.onclick()
				}
			})

		}
	}

	getPixel = (obj,i,j,channel = 0)=>{
		return obj.data[i*obj.cols*obj.channels() + j*obj.channels()+channel]
	}
	setPixel = (obj,i,j,value,channel=0)=>{
		obj.data[i*obj.cols*obj.channels() + j*obj.channels()+channel] = value
	}

	CanvasMouseMoveDrawLine = (event) => {
		let x = this.XPointReplace(event.offsetX);
		let y = this.YPointReplace(event.offsetY);
		this.paintShowCanvas();
		this.drawLine(this.Nodes.canvas.getContext('2d'), this.mousePrevX, this.mousePrevY, x, y, this.lineWidth*this.scale);
	};

	CanvasMouseUpDrawLine = (event) => {
		let prePoint = this.disToOri(this.mousePrevX, this.mousePrevY);
		let point = this.disToOri(this.XPointReplace(event.offsetX), this.YPointReplace(event.offsetY))
		let bCtx = this.Nodes.bCanvas.getContext('2d');
		this.drawLine(bCtx, prePoint[0], prePoint[1], point[0], point[1], this.lineWidth);
		this.updateOpacityCanvas();
		this.paintShowCanvas();
		this.RecordHistory(this.constructHistoryRecordDraw([prePoint, point]));
		this.removeEvent(this.Nodes.canvas,'mousemove', this.CanvasMouseMoveDrawLine);
		this.removeEvent(this.Nodes.canvas,'mouseup', this.CanvasMouseUpDrawLine);
		this.addEvent(this.Nodes.canvas, 'mousemove', this.CanvasMouseMoveCircle);
	};
	
	CanvasMouseMoveEraser = (event)=>{
		let point = this.disToOri(this.XPointReplace(event.offsetX), this.YPointReplace(event.offsetY))
		let bCtx = this.Nodes.bCanvas.getContext('2d');
		this.eraserFunc(bCtx, point[0], point[1]);
		this.Arrays.eraserPoints.push(point);
		this.updateOpacityCanvas();
		this.paintShowCanvas();
	}

	CanvasMouseUpEraser = (event)=>{
		this.CanvasMouseMoveEraser(event);
		this.RecordHistory(this.constructHistoryRecordDraw(Array.from(this.Arrays.eraserPoints)));
		this.removeEvent(this.Nodes.canvas,'mousemove', this.CanvasMouseMoveEraser);
		this.removeEvent(this.Nodes.canvas,'mouseup', this.CanvasMouseUpEraser);
		this.addEvent(this.Nodes.canvas,'mousemove', this.CanvasMouseMoveCircle);
	}

	// 显示画笔大小的圆框
	CanvasMouseMoveCircle = (event) => {
		let x = event.offsetX;
		let y = event.offsetY;
		this.hoverX = x;
		this.hoverY = y;
		this.paintShowCanvas();
		this.drawCircle(this.Nodes.canvas.getContext('2d'), x, y, null);
	}

	// 快捷键函数
	CanvasKeyDown = (event) => {

		if (event.key === '['){
			this.lineWidth = this.lineWidth > this.minLineWidth ? this.lineWidth - 1: this.lineWidth;
			this.Nodes.brushSizeChangeInput.value = (this.lineWidth-this.minLineWidth)/(this.maxLineWidth - this.minLineWidth) * 100;
			this.paintShowCanvas();
			this.drawCircle(this.Nodes.canvas.getContext('2d'), this.hoverX, this.hoverY, null);
		}
		if (event.key === ']'){
			this.lineWidth = this.lineWidth < this.maxLineWidth ? this.lineWidth + 1: this.lineWidth;
			this.Nodes.brushSizeChangeInput.value = (this.lineWidth-this.minLineWidth)/(this.maxLineWidth - this.minLineWidth) * 100;
			this.paintShowCanvas();
			this.drawCircle(this.Nodes.canvas.getContext('2d'), this.hoverX, this.hoverY, null);
		}
		if (event.ctrlKey && event.key==='z' &&(!event.shiftKey) ){
			this.RollBack();
		}
		if (event.ctrlKey && event.shiftKey && event.key==='Z' ){
			this.Forward();
		}
        if (event.key === 'Enter'){
            this.Save();
        }
		if (event.key === 'Escape'){
			this.Cancel();
		}
		if (event.key === 'x'){
			this.drawMode = this.drawMode === 'eraser' ? 'brush':'eraser';
			emt('brushOrEraserFlag').className = emt('brushOrEraserFlag').className === 'icon-pencil'? 'icon-eraser':'icon-pencil';
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
		this.removeEvent(this.Nodes.canvas,'mousemove', this.CanvasMouseMoveDrag);
		this.removeEvent(this.Nodes.canvas,'mouseup', this.CanvasMouseUpDrag);
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
		this.drawCircle(this.Nodes.canvas.getContext('2d'), this.hoverX, this.hoverY, null);
	}

	changeOpacity = (event) => {
		this.opacity = event.target.value/100.0;
		this.updateOpacityCanvas();
		this.paintShowCanvas();
	}

	changeBrushSize = (event) =>{
		this.lineWidth = event.target.value/100.0 * (this.maxLineWidth - this.minLineWidth)+this.minLineWidth;
		this.lineWidth = parseInt(this.lineWidth);
		this.paintShowCanvas();
		this.drawCircle(this.Nodes.canvas.getContext('2d'), this.hoverX, this.hoverY, null);
	}

	showHideCreateMaskAnnotation = (event)=>{
		let ano = emt("createMaskAnnotation");
		if (ano.style.display=='none'){ano.style.display='block';}
		else{ano.style.display='none';}
	}
	// ***************************************************  canvas事件结束

	constructHistoryRecordDraw = (points) =>{
		let content = []
		points.forEach((element)=>{
			content.push({x:element[0], y:element[1]})
		})
		let record = {
			contentType: this.drawMode,
			content: content,
			lineWidth:this.lineWidth,
			color:this.color
		}
		return record
	}

	RecordHistory = (record) => {
		if(this.Arrays.history.length == this.historyPointer){
			this.Arrays.history.push(record)
		}else{
			this.Arrays.history[this.historyPointer] = record;
			this.Arrays.history.splice(this.historyPointer+1)
		}
		this.historyPointer++;
	}

	RollBack = () => {
		if (this.historyPointer == 0){return;}
		this.historyPointer--;
		this.paintShowCanvasFromHistory();

		console.log(this.historyPointer, this.Arrays.history)
	}

	Forward = ()=>{
		if (this.historyPointer == this.Arrays.history.length){return}
		this.historyPointer++;
		this.paintShowCanvasFromHistory()
	}


    // 根据实际情况，填写自己的保存功能
    Save = (event) =>{
        let mask = this.getMask();
		win.saveMask(mask);
	}

	Cancel = () =>{
		let createMaskModal = document.getElementById('createMaskModal');
		createMaskModal.style.display='none';
		document.removeEventListener('keydown', this.CanvasKeyDown);
	}

	// 阻止默认的右键菜单
	preventContextMenu = (event)=>{
		event.preventDefault();
	}


	// ----------------------自定义事件管理，用于获取所有注册在元素上的事件-------------------------

	// 清空当前对象的所有绑定事件
	saveAndClearEvent = (obj)=>{
		let eventList = obj.eventList;
		if(eventList){
			obj.oldEventList = Object.assign({}, obj.eventList);

			for (let key in eventList){
				let eventListType = eventList[key];
				for (let i = 0; i < eventListType.length; i++){
					obj.removeEventListener(key, eventListType[i].callback);
				}
			}
			obj.eventList = {};
		}
	}

	// 恢复当前对象的所有绑定事件（asveAndClearEvent清空的事件）
	resotreEvent= (obj)=>{
		if(obj.eventList){
			for (let key in obj.eventList){
				let eventListType = obj.eventList[key];
				for (let i = 0; i < eventListType.length; i++){
					obj.removeEventListener(key,eventListType[i].callback);
				}
			}
		}
		if(obj.oldEventList){
			obj.eventList = Object.assign({}, obj.oldEventList);
			for (let key in obj.eventList){
				let eventListType = obj.eventList[key];
				for (let i = 0; i < eventListType.length; i++){
					obj.addEventListener(key,eventListType[i].callback);
				}
			}
		}
		
	}

	addEvent= (obj, type, callback, useCapture)=>{
		obj.addEventListener(type, callback, useCapture);
		this._addEvent(obj, type, callback, useCapture);
	}

	removeEvent = (obj, type, callback, useCapture) =>{
		obj.removeEventListener(type, callback, useCapture);
		this._removeEvent(obj, type, callback, useCapture);
	}

	_addEvent = (obj, type, callback, useCapture) =>{
		if (obj.eventList) {
			if (obj.eventList[type]) {
				obj.eventList[type].push({ callback: callback, useCapture: useCapture });
			} else {
				obj.eventList[type] = [{ callback: callback, useCapture: useCapture }];
			}
		} else {
			obj.eventList = {};
			obj.eventList[type] = [{ callback: callback, useCapture: useCapture }];
		}
	}

	_removeEvent = (obj, type, callback, useCapture)=>{
		var eventList=obj.eventList;
		if (eventList) {
			if (eventList[type]) {            
				for (var i = 0; i < eventList[type].length; i++) {
					if (eventList[type][i].callback===callback) {
						eventList[type].splice(i, 1);
						if (eventList[type].length===0) {
							delete eventList[type];
						}
						break;
					}
				}
			} 
		} 
	}
}
