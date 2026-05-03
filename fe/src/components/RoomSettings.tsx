import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { 
  SITUATION_GROUP_LABELS, 
  EMOTION_GROUP_LABELS,
  type SituationGroup,
  type EmotionGroup 
} from '@/constants/cards'

interface RoomSettingsProps {
  isHost: boolean
  currentSettings: {
    situationGroups: SituationGroup[]
    emotionGroups: EmotionGroup[]
  }
  onUpdate: (settings: {
    situationGroups: SituationGroup[]
    emotionGroups: EmotionGroup[]
  }) => void
  disabled?: boolean
}

export function RoomSettings({ isHost, currentSettings, onUpdate, disabled }: RoomSettingsProps) {
  const [situationGroups, setSituationGroups] = useState<SituationGroup[]>(currentSettings.situationGroups)
  const [emotionGroups, setEmotionGroups] = useState<EmotionGroup[]>(currentSettings.emotionGroups)

  useEffect(() => {
    setSituationGroups(currentSettings.situationGroups)
    setEmotionGroups(currentSettings.emotionGroups)
  }, [currentSettings])

  const handleSituationToggle = (group: SituationGroup) => {
    setSituationGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    )
  }

  const handleEmotionToggle = (group: EmotionGroup) => {
    setEmotionGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    )
  }

  const handleSave = () => {
    if (situationGroups.length === 0 || emotionGroups.length === 0) {
      alert('Phải chọn ít nhất 1 nhóm tình huống và 1 nhóm cảm xúc')
      return
    }
    onUpdate({ situationGroups, emotionGroups })
  }

  const hasChanges = 
    JSON.stringify(situationGroups.sort()) !== JSON.stringify(currentSettings.situationGroups.sort()) ||
    JSON.stringify(emotionGroups.sort()) !== JSON.stringify(currentSettings.emotionGroups.sort())

  if (!isHost) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cài đặt phòng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Nhóm tình huống:</h3>
            <p className="text-sm text-muted-foreground">
              {currentSettings.situationGroups.map(g => SITUATION_GROUP_LABELS[g]).join(', ')}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Nhóm cảm xúc:</h3>
            <p className="text-sm text-muted-foreground">
              {currentSettings.emotionGroups.map(g => EMOTION_GROUP_LABELS[g]).join(', ')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cài đặt phòng (Host)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-3">Nhóm tình huống (chọn ít nhất 1):</h3>
          <div className="space-y-2">
            {(Object.keys(SITUATION_GROUP_LABELS) as SituationGroup[]).map(group => (
              <div key={group} className="flex items-center space-x-2">
                <Checkbox
                  id={`situation-${group}`}
                  checked={situationGroups.includes(group)}
                  onCheckedChange={() => handleSituationToggle(group)}
                  disabled={disabled}
                />
                <Label htmlFor={`situation-${group}`} className="cursor-pointer">
                  {SITUATION_GROUP_LABELS[group]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Nhóm cảm xúc (chọn ít nhất 1):</h3>
          <div className="space-y-2">
            {(Object.keys(EMOTION_GROUP_LABELS) as EmotionGroup[]).map(group => (
              <div key={group} className="flex items-center space-x-2">
                <Checkbox
                  id={`emotion-${group}`}
                  checked={emotionGroups.includes(group)}
                  onCheckedChange={() => handleEmotionToggle(group)}
                  disabled={disabled}
                />
                <Label htmlFor={`emotion-${group}`} className="cursor-pointer">
                  {EMOTION_GROUP_LABELS[group]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={disabled || situationGroups.length === 0 || emotionGroups.length === 0}
            className="w-full"
          >
            Lưu cài đặt
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
