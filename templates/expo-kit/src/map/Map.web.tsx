import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER: [number, number] = [41.0082, 28.9784]

/**
 * Web export varyantı — Metro'nun `.web.tsx` platform çözümü sayesinde bu
 * dosya yalnızca `expo export -p web` build'inde devreye girer. API anahtarı
 * gerektirmeyen OpenStreetMap tile'ları kullanır.
 */
export function ExampleMap(): React.JSX.Element {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={11} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap katkıda bulunanlar"
      />
      <Marker position={DEFAULT_CENTER}>
        <Popup>Örnek nokta</Popup>
      </Marker>
    </MapContainer>
  )
}
