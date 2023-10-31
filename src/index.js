const videoButton = document.getElementById('take-pic');
const backButton = document.getElementById('back-to-cam');
const video = document.getElementById('vid');
const imgCanvas = document.getElementById('imgCanvas');
const image = document.getElementById('myImage');
let height = 320;
let width = 0;
let streaming = false;

let ImageRecorder;

let capturedImage;


videoButton.onclick = (ev)=>{
        takePicture();
        ev.preventDefault();
}

backButton.onclick = (ev)=>{
    clearPhoto();
}

async function init(){
    try{
        const stream = await navigator.mediaDevices.getUserMedia({
            audio:false,
            video:true,
            height:320,
            width:240
        }).then((stream) =>{
            video.srcObject = stream;
            window.stream = stream;
        });
    } catch (err){
        console.log('error retrieving medai device');
        console.log(err);
    }
    video.addEventListener('canplay', (event) =>{
        if(!streaming){
            width = video.videoWidth/ (video.videoHeight/height);

            if(isNaN(width)) width=height/(4/3);
        }
    })




}

function clearPhoto(){
    let context = imgCanvas.getContext('2d');
    imgCanvas.style.display = 'none';
    video.style.display = 'block';
    videoButton.disabled = false;
    videoButton.style.backgroundColor = 'aquamarine';
    videoButton.style.display='block';
    backButton.style.display = 'none';
    let data = imgCanvas.toDataURL('image/png');
    image.setAttribute('src',data);
}


function takePicture(){
    let context = imgCanvas.getContext('2d');
    if(width&&height){
        imgCanvas.width = width;
        imgCanvas.height = height;
        video.style.display='none';
        imgCanvas.style.display='block';
        backButton.style.display='block';
        videoButton.disabled = true;
        videoButton.style.display='none';
        backButton.disabled = false;
        videoButton.style.backgroundColor='grey';
        context.drawImage(video,0,0,width,height);
        let data = imgCanvas.toDataURL('image/png');
        image.setAttribute('src',data);
    }else{
        clearPhoto();
    }
}


function recordVideo(event){
    console.log(event);
    if(event){
        console.log('tester for event.data');
        console.log(typeof(event));
        video.srcObject = null;
        let pictureDay = document.querySelector("picture-day");
        let newImage = document.createElement("img");
        newImage.src = URL.createObjectURL(event);
        pictureDay.appendChild(newImage);
        video.src = videoUrl;
    }
}


window.onload = () =>{
    init();
}