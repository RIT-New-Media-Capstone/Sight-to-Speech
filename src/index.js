const videoButton = document.getElementById('take-pic');
const backButton = document.getElementById('back-to-cam');
const video = document.getElementById('vid');
const imgCanvas = document.getElementById('imgCanvas');
const image = document.getElementById('myImage');
const errorMessage = document.querySelector("#you-got-trouble");
const setErrorMessage = (message) => errorMessage.innerHTML = message?.toString();
let height = 320;
let width = 0;
let streaming = false;

videoButton.onclick = (ev) => {
    takePicture();
    ev.preventDefault();
}

backButton.onclick = (ev) => {
    clearPhoto();
    ev.preventDefault();
}

// Very quick and dirty method of identifying which camera is the back camera
function deviceIsBackCamera(deviceInfo) {
    return deviceInfo.label.search("back") !== -1 && deviceInfo.kind === "videoinput";
}

async function init() {
    try {
        // https://simpl.info/getusermedia/sources/js/main.js
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        const backCamera = deviceInfos.find(deviceIsBackCamera);
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: backCamera ? {
                    exact: backCamera.deviceId,
                } : undefined,
            },
            height: 320,
            width: 240
        });
        window.stream = stream;
        video.srcObject = stream;
    } catch (err) {
        setErrorMessage(err);
    }
    video.addEventListener('canplay', (event) => {
        if (!streaming) {
            width = video.videoWidth / (video.videoHeight / height);

            if (isNaN(width)) width = height / (4 / 3);
        }
    })
}

function clearPhoto() {
    let context = imgCanvas.getContext('2d');
    imgCanvas.style.display = 'none';
    video.style.display = 'block';
    videoButton.disabled = false;
    videoButton.style.backgroundColor = 'aquamarine';
    videoButton.style.display = 'block';
    backButton.style.display = 'none';
    let data = imgCanvas.toDataURL('image/png');
    image.setAttribute('src', data);
}

function takePicture() {
    let context = imgCanvas.getContext('2d');
    if (width && height) {
        imgCanvas.width = width;
        imgCanvas.height = height;
        video.style.display = 'none';
        imgCanvas.style.display = 'block';
        backButton.style.display = 'block';
        videoButton.disabled = true;
        videoButton.style.display = 'none';
        backButton.disabled = false;
        videoButton.style.backgroundColor = 'grey';
        context.drawImage(video, 0, 0, width, height);
        let data = imgCanvas.toDataURL('image/png');
        image.setAttribute('src', data);
    } else {
        clearPhoto();
    }
}

function recordVideo(event) {
    if (event) {
        setErrorMessage(event);
        video.srcObject = null;
        let pictureDay = document.querySelector("picture-day");
        let newImage = document.createElement("img");
        newImage.src = URL.createObjectURL(event);
        pictureDay.appendChild(newImage);
        video.src = videoUrl;
    }
}

window.onload = () => {
    try {
        init();
    } catch (e) {
        setErrorMessage(e.toString());
    }
}