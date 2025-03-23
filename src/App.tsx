import { useCallback, useEffect, useRef, useState } from 'react';
import type * as React from 'react';
import YouTube, { type YouTubeProps, type YouTubePlayer } from 'react-youtube';

function App() {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [startMinutes, setStartMinutes] = useState(2);
  const [startSeconds, setStartSeconds] = useState(0);
  const [endMinutes, setEndMinutes] = useState(2);
  const [endSeconds, setEndSeconds] = useState(5);
  const [videoId, setVideoId] = useState('SR_DgMTC_ho');
  const [isEditing, setIsEditing] = useState(false);
  const [tempVideoId, setTempVideoId] = useState(videoId);
  const [videoHeight, setVideoHeight] = useState('auto');
  const [isRepeating, setIsRepeating] = useState(false);
  const [opts, setOpts] = useState({});
  const [sections, setSections] = useState<{ key: number; startMinutes: number; startSeconds: number; endMinutes: number; endSeconds: number; videoId: string }[]>([]);
  const [tempStartMinutes, setTempStartMinutes] = useState(0);
  const [tempStartSeconds, setTempStartSeconds] = useState(0);
  const [tempEndMinutes, setTempEndMinutes] = useState(0);
  const [tempEndSeconds, setTempEndSeconds] = useState(0);

  const updateOpts = useCallback(() => {
    const currentTime = playerRef.current?.getCurrentTime();
    setOpts({
      playerVars: {
        start: isRepeating ? startMinutes * 60 + startSeconds : currentTime,
        end: isRepeating ? endMinutes * 60 + endSeconds : undefined,
      },
      width: '100%',
      height: Number.parseInt(videoHeight) > 360 ? '360px' : videoHeight,
    });
  }, [
    isRepeating,
    startMinutes,
    startSeconds,
    endMinutes,
    endSeconds,
    videoHeight,
  ]);

  useEffect(() => {
    const updateVideoHeight = () => {
      const width = window.innerWidth;
      const height = (width * 9) / 16;
      setVideoHeight(`${height}px`);
    };

    updateVideoHeight();
    window.addEventListener('resize', updateVideoHeight);

    return () => {
      window.removeEventListener('resize', updateVideoHeight);
    };
  }, []);

  useEffect(() => {
    updateOpts();
  }, [updateOpts]);

  useEffect(() => {
    const savedSections = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !isNaN(Number(key))) {
        const section = JSON.parse(localStorage.getItem(key) || '{}');
        savedSections.push({ key: Number(key), ...section });
      }
    }
    setSections(savedSections);
  }, []);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === window.YT.PlayerState.ENDED && playerRef.current) {
      if (isRepeating) {
        playerRef.current
          .seekTo(startMinutes * 60 + startSeconds, true)
          .catch((error) => {
            console.error('Error seeking to start:', error);
          });
      } else {
        playerRef.current.playVideo().catch((error) => {
          console.error('Error playing video:', error);
        });
      }
    }
  };

  const handleSave = () => {
    setVideoId(tempVideoId);
    setIsEditing(false);
  };

  const setTimeToCurrent = async (
    setMinutes: React.Dispatch<React.SetStateAction<number>>,
    setSeconds: React.Dispatch<React.SetStateAction<number>>,
  ): Promise<void> => {
    if (playerRef.current) {
      const currentTime = await playerRef.current.getCurrentTime();
      setMinutes(Math.floor(currentTime / 60));
      setSeconds(Math.floor(currentTime % 60));
    }
  };

  const saveSection = () => {
    const keys = Object.keys(localStorage).map(Number).filter((key) => !isNaN(key));
    const maxKey = keys.length > 0 ? Math.max(...keys) : -1;
    const newKey = maxKey + 1;
    const section = {
      startMinutes: tempStartMinutes,
      startSeconds: tempStartSeconds,
      endMinutes: tempEndMinutes,
      endSeconds: tempEndSeconds,
    };
    const sectionData = {
      videoId,
      startMinutes: section.startMinutes,
      startSeconds: section.startSeconds,
      endMinutes: section.endMinutes,
      endSeconds: section.endSeconds,
    };
    localStorage.setItem(`${newKey}`, JSON.stringify(sectionData));
    console.log(`Section ${newKey + 1} saved:`, sectionData);

    setSections((prevSections) => [...prevSections, { key: newKey, ...section, videoId }]);

    setTempStartMinutes(0);
    setTempStartSeconds(0);
    setTempEndMinutes(0);
    setTempEndSeconds(0);
  };

  const playSection = (section: { startMinutes: number; startSeconds: number; endMinutes: number; endSeconds: number }) => {
    if (playerRef.current) {
      playerRef.current.seekTo(section.startMinutes * 60 + section.startSeconds, true).then(() => {
        setIsRepeating(true);
        setStartMinutes(section.startMinutes);
        setStartSeconds(section.startSeconds);
        setEndMinutes(section.endMinutes);
        setEndSeconds(section.endSeconds);
        playerRef.current?.playVideo();
      }).catch((error) => {
        console.error('Error playing section:', error);
      });
    }
  };

  const deleteSection = (key: number) => {
    localStorage.removeItem(`${key}`);
    setSections((prevSections) => prevSections.filter((section) => section.key !== key));
  };

  return (
    <>
      <h1 className="text-center text-xl font-bold">BY THE REPEAT</h1>
      <div className="flex flex-col items-center">
        <div
          className="w-full relative"
          style={{ paddingBottom: '56.25%', maxWidth: '640px' }}
        >
          <div className="absolute top-0 left-0 w-full h-full">
            <YouTube
              videoId={videoId}
              opts={opts}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
            />
          </div>
        </div>
        <div className="m-4">
          <label className="block">
            Video ID:
            <div className="flex items-center">
              <input
                type="text"
                value={tempVideoId}
                onChange={(e) => setTempVideoId(e.target.value)}
                className={
                  'border rounded p-2 w-full border-gray-300 disabled:bg-gray-200 disabled:text-gray-500'
                }
                disabled={!isEditing}
              />
              <button
                type={'button'}
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                className="ml-2 p-2 rounded bg-black text-white"
              >
                {isEditing ? 'Save' : 'Edit'}
              </button>
            </div>
          </label>
          <div className="mt-4">
            <div className="flex space-x-2">
              <label className="block w-full">
                Section Start Time:
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={tempStartMinutes}
                    onChange={(e) => setTempStartMinutes(Number(e.target.value))}
                    className="border rounded p-2 w-full border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
                  />
                  <span>:</span>
                  <input
                    type="tel"
                    value={tempStartSeconds}
                    onChange={(e) => setTempStartSeconds(Number(e.target.value))}
                    className="border rounded p-2 w-full border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
                  />
                  <button
                    type={'button'}
                    onClick={() => setTimeToCurrent(setTempStartMinutes, setTempStartSeconds)}
                    className="ml-2 p-2 rounded bg-black text-white"
                  >
                    Now
                  </button>
                </div>
              </label>
            </div>
            <div className="flex space-x-2 mt-2">
              <label className="block w-full">
                Section End Time:
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={tempEndMinutes}
                    onChange={(e) => setTempEndMinutes(Number(e.target.value))}
                    className="border rounded p-2 w-full border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
                  />
                  <span>:</span>
                  <input
                    type="tel"
                    value={tempEndSeconds}
                    onChange={(e) => setTempEndSeconds(Number(e.target.value))}
                    className="border rounded p-2 w-full border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
                  />
                  <button
                    type={'button'}
                    onClick={() => setTimeToCurrent(setTempEndMinutes, setTempEndSeconds)}
                    className="ml-2 p-2 rounded bg-black text-white"
                  >
                    Now
                  </button>
                </div>
              </label>
            </div>
            <button
              type={'button'}
              onClick={() => saveSection()}
              className="mt-2 p-2 rounded bg-green-500 text-white"
            >
              Save Section
            </button>
          </div>
          {sections.length > 0 && (
            <div className="mt-4">
              <h2 className="text-lg font-bold">Saved Sections</h2>
              {sections.map((section) => (
                <div key={section.key} className="mt-2">
                  <div>Section {section.key}</div>
                  <div>Video ID: {section.videoId}</div>
                  <div>Start Time: {section.startMinutes}:{section.startSeconds}</div>
                  <div>End Time: {section.endMinutes}:{section.endSeconds}</div>
                  <button
                    type={'button'}
                    onClick={() => playSection(section)}
                    className="mt-2 p-2 rounded bg-blue-500 text-white"
                  >
                    Play
                  </button>
                  <button
                    type={'button'}
                    onClick={() => deleteSection(section.key)}
                    className="mt-2 p-2 rounded bg-red-500 text-white ml-2"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
