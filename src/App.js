import './App.css';
import React, { useEffect, useRef, useState } from 'react';
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import '@tensorflow/tfjs-backend-cpu';
import { initNotifications, notify } from '@mycv/f8-notification';
import { Howl } from 'howler';
import soundURL from './assets/hey_sondn.mp3'


var sound = new Howl({
  src: [soundURL]
});

sound.play();

const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 20;
const TOUCHED_CONFIDECE = 0.8



function App() {

  const video = useRef();
  const classifier = useRef();
  const canPLaySound = useRef(true)
  const mobilenetModule = useRef();
  const [touch, setTouch] = useState(false)


  const init = async () => {

    await setupCamera();

    console.log('setup camera success');


    classifier.current = knnClassifier.create();

    mobilenetModule.current = await mobilenet.load();

    console.log('setup done');
    console.log('khong cham tay len mat va ban train 1');

    initNotifications({ cooldown: 3000 });



  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;


      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener("loadeddata", resolve)
          },
          error => reject(error)
        );
      } else {
        reject()
      }
    })
  }

  const train = async label => {
    console.log(`${label} dang train cho may mat dep trai`);

    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progress ${parseInt((i + 1) / TRAINING_TIMES * 100)}%`);
      await training(label)
    }
  }

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label)
      await sleep(100);
      resolve();
    })
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding)

    if (result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDECE
    ) {
      console.log('Touched');
      if (canPLaySound.current) {
        canPLaySound.current = false
        sound.play();
      }
      notify('Bỏ tay ra', { body: 'Bạn vừa chạm tay vào mặt.' });
      setTouch(true)
    } else {
      console.log('Not touch');
      setTouch(false)
    }

    await sleep(200);

    run();

  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    init();
    sound.on('end', function () {
      canPLaySound.current = true
    });

    // cleanup
    return () => {

    }

  }, [])
  return (
    <div className={`main ${touch ? 'touched' : ''}`}>
      <video
        ref={video}
        className="video"
        autoPlay
      />

      <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className="btn" onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
        <button className="btn" onClick={() => run()}>Run</button>

      </div>
    </div>
  );
}

export default App;
