import { AVATAR_PIXELS, AVATAR_QUALITY } from "../../../shared/profile-avatar";

// Centre-crops a chosen photo to a square JPEG data URL for saveAvatarProfile,
// the same processing as the first-run profile setup.
export function avatarDataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error("Choose a photo.")); return; }
    if (file.size > 4 * 1024 * 1024) { reject(new Error("Choose a photo up to 4 MB.")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("That file isn’t a supported image."));
      image.onload = () => {
        const side = Math.min(AVATAR_PIXELS, image.width, image.height);
        const canvas = document.createElement("canvas");
        canvas.width = side;
        canvas.height = side;
        const context = canvas.getContext("2d");
        if (!context) { reject(new Error("Could not process the image.")); return; }
        const crop = Math.min(image.width, image.height);
        context.imageSmoothingQuality = "high";
        context.drawImage(image, (image.width - crop) / 2, (image.height - crop) / 2, crop, crop, 0, 0, side, side);
        resolve(canvas.toDataURL("image/jpeg", AVATAR_QUALITY));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
