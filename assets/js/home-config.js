export const HOME_CONFIG = {
  cutInterval: { min: 8000, max: 18000 },
  tear: { duration: 90, maxOffset: 7, minHeight: 2, maxHeight: 5 },
  tracking: { minQuiet: 3600, maxQuiet: 7600, minLife: 5000, maxLife: 8800, fade: 900, distanceScale: .62, opacity: .68 },
  feeds: [
    { id: "camera-01", desktop: "assets/media/home/camera-01-desktop.mp4", mobile: "assets/media/home/camera-01-mobile.mp4", poster: "assets/media/home/camera-01-poster.jpg" },
    { id: "camera-02", desktop: "assets/media/home/camera-02-desktop.mp4", mobile: "assets/media/home/camera-02-mobile.mp4", poster: "assets/media/home/camera-02-poster.jpg" },
    { id: "camera-03", desktop: "assets/media/home/camera-03-desktop.mp4", mobile: "assets/media/home/camera-03-mobile.mp4", poster: "assets/media/home/camera-03-poster.jpg" }
  ]
};
