import { useLocalSearchParams } from "expo-router";

import { BookEditorScreen } from "@/components/BookEditorScreen";

export default function EditBookScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  return <BookEditorScreen mode="edit" bookId={bookId} />;
}
