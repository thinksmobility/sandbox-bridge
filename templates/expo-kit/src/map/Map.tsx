import { Text, View } from 'react-native'

/**
 * Native (iOS/Android) yer tutucu — bu kit `react-native-maps` GETİRMEZ
 * (marka API anahtarı gerektirir, gate'i karmaşıklaştırır). Gerçek native
 * harita gereken bir demo için bu dosyayı değiştirin; web varyantı
 * (`Map.web.tsx`) zaten `react-leaflet` + OpenStreetMap ile çalışır.
 */
export function ExampleMap(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-slate-100">
      <Text className="text-sm text-slate-500">Harita yalnızca web export'ta gösterilir</Text>
    </View>
  )
}
