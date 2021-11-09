function emt(id){
    return document.getElementById(id);
}

class mainWin{
    constructor(){
        this.files = [];
        this.index = 0;
        this.initial();
    }

    initial = ()=>{
        emt('btnSelectFolder').onclick = ()=>{
            emt('openFolderInput').click()
        }
        emt('openFolderInput').onchange = this.setFloder;

        emt('btnSelectFiels').onclick = ()=>{
            emt('openFilesInput').click()
        }
        emt('openFilesInput').onchange = this.setFloder;
    }

    setFloder = (event)=>{
        this.files = Array.from(event.target.files);
        // 过滤files，对于既有图片又有标签的，去除这些图片
        let filesName = [];
        let filesCopy = [];
        this.files.forEach((Element)=>{
            filesName.push(Element.name);
        })
        filesName.forEach((Element, idx)=>{
            if (Element.includes('_label')){
                console.log('label', Element)
                return;
            }
            let labelName = Element.substr(0,Element.length-4) + '_label.png';
            if (filesName.indexOf(labelName) === -1){
                filesCopy.push(this.files[idx]);
                console.log('push ', Element)
            }else{
                console.log('exist', Element)
            }
        })
        this.files = filesCopy;


        this.index = -1;
        this.nextImg();
        emt('totalNum').innerText = this.files.length;
    }

    nextImg = ()=>{
        this.index++;
        if(this.index == this.files.length) this.index = 0;
        let file = this.files[this.index];
        let reader = new FileReader();
        let img = new Image();
        reader.onload = (event)=>{
            img.src = reader.result;
        }
        reader.readAsDataURL(file);
        img.onload = (event)=>{
            createMask.SetImage(0, img, 0, 0, img.width, img.height, null);
        }
        emt('curNum').innerText = this.index+1;
        console.log('done')
    }

    prevImg = ()=>{
        this.index--;
        if(this.index == -1) this.index = this.files.length-1;
        let file = this.files[this.index];
        let reader = new FileReader();
        let img = new Image();
        reader.onload = (event)=>{
            img.src = reader.result;
        }
        reader.readAsDataURL(file);
        img.onload = (event)=>{
            createMask.SetImage(0, img, 0, 0, img.width, img.height, null);
        }
        emt('curNum').innerText = this.index+1;
    }

    saveMask = (mask) =>{
        let maskName = this.files[this.index].name.slice(0, -4)+'_label.png';
        console.log(maskName)
        ajax("post", "/upload/mask", true, JSON.stringify({"name":maskName, "mask":mask}), this.nextImg)
    }

}

const win = new mainWin();
const createMask = new MaskCreate();

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