# maskCreateTool
a tool to create label(mask) of semantic segmentation. 一个用于制作语义分割标签（掩码）的工具

can make multi-category mask (background is black pixel of value 0, object is pixel of self-defined category).  可以制作多分类语义分割的掩码（背景是值为0的黑色像素，目标是自定义的类别像素）

you can also use it as a drawing board demo which implement zoom, drag, and opacity.  你也可以把它当成一个实现了放缩，拖拽和改变不透明度的画图板样例

# How to run

+ run command
`python server.py`
+ open url:http://localhost:5000/static/home.html in browser

# How to use

<img src="./readme_img/2021-11-09 195445.gif" style="zoom: 33%;" />

+ custom your type-color-translation-table in file ./static/resource/colorTransTable.json

+ 1, select images

+ 2, paint object

+ 3, click '确定' or press Enter key to save mask and move on the next img

	**(mask will be saved in the floder ./static/resource/, and be named with \[img_name\]\_label.png)**

# Shorcut keys
+ resize the brush: [ and ]
+ drag: hold the right button of mouse
+ resize the img: mouse whell
+ change brush and eraser: x
+ roll-back: Ctrl + z
+ undo roll-back: Ctrl + Shift + z
+ Save and paint next img: Enter
