import { Ref } from 'vue'

export type MenuContext = {
  selectIndex: Ref<number>
  onSelected: (index: number) => void
}
