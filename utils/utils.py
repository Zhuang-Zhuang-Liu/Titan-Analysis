# utils
def show_images_in_directory(directory):
    directory = os.path.join(directory, '') if not directory.endswith('/') else directory  # 确保传入的路径字符串以斜杠结尾
    for filename in os.listdir(directory):  # 遍历目录下的所有文件
        if filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')): # 检查文件是否为图片
            img_path = os.path.join(directory, filename)
            img = Image.open(img_path)
            plt.figure(figsize=(5, 7))  # 可选：设置图像显示窗口的大小
            plt.imshow(img)
            plt.axis('off')  # 不显示坐标轴
            plt.title(filename)  # 显示图片文件名作为标题
            plt.show()
            
               
def folder_clean(folder_path):
    if os.path.isdir(path):
        for file in os.listdir(folder_path):
            file_path = os.path.join(folder_path, file)
            if os.path.isfile(file_path):
                os.remove(file_path)
        print('***folder clean ready***')
    else:     
        print('***folder not exist***')