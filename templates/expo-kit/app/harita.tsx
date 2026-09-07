import { Text, View } from 'react-native'
import { SandboxSelectable } from '@tmob/sandbox-bridge/react'
import { ExampleMap } from '../src/map/Map'

export default function MapScreen(): React.JSX.Element {
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <Text className="text-2xl font-semibold text-slate-900">Örnek Harita</Text>
      <SandboxSelectable screenId="scr-example-map" componentId="cmp-example-map" label="Örnek harita">
        <View className="mt-4 h-80 overflow-hidden rounded-2xl border border-slate-200">
          <ExampleMap />
        </View>
      </SandboxSelectable>
    </View>
  )
}
