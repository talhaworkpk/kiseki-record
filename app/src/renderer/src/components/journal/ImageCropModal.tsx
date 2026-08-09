import { useState, useRef } from 'react'
import { X, Crop as CropIcon } from 'lucide-react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete
}: {
  isOpen: boolean
  imageSrc: string
  onClose: () => void
  onCropComplete: (croppedBase64: string) => void
}) {
  const [crop, setCrop] = useState<Crop>()
  const imageRef = useRef<HTMLImageElement | null>(null)

  if (!isOpen) return null

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    )
    setCrop(crop)
  }

  const handleCrop = () => {
    if (!imageRef.current || !crop) return

    const canvas = document.createElement('canvas')
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height
    
    canvas.width = crop.width * scaleX
    canvas.height = crop.height * scaleY
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(
      imageRef.current,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    )

    const base64Image = canvas.toDataURL('image/jpeg')
    onCropComplete(base64Image)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CropIcon className="text-primary" /> Crop Photo
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-auto flex-1 flex flex-col items-center justify-center bg-accent/20">
          <ReactCrop crop={crop} onChange={c => setCrop(c)}>
            <img 
              ref={imageRef} 
              src={imageSrc} 
              alt="Crop preview" 
              className="max-h-[60vh] object-contain mx-auto" 
              onLoad={onImageLoad} 
              crossOrigin="anonymous" 
            />
          </ReactCrop>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold hover:bg-accent rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleCrop} className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors">
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  )
}
