# maskCreateTool
a tool to create label(mask) of semantic segmentation. 一个用于制作语义分割标签（掩码）的工具

can only make two-category mask (background is black pixel of value 0, object is white pixel of value 255)只能制作二分类语义分割的掩码（背景是值为0的黑色像素，目标是值为1的白色像素）

you can also use it as a drawing board demo。你也可以把它当成一个画图板样例

# How to run

+ run command
`python server.py`
+ open url:http://localhost:5000/static/home.html in broswer

# How to use

<img src="./readme_img/2021-11-09 195445.gif" style="zoom: 33%;" />

+ 1, select images

+ 2, paint object to white

+ 3, click '确定' or press Enter key to save mask and move on the next img

	**(mask will be saved in the floder ./static/resource/, and be named with \[img_name\]\_label.png)**

# Shorcut keys
+ resize the brush: [ and ]
+ drag: hold the right button of mouse
+ resize the img: mouse whell
+ roll-back: Ctrl + z
+ Save and next img: Enter