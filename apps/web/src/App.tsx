import { parseRoomPath, useRoute } from './lib/useRoute';
import { Landing } from './pages/Landing';
import { RoomPage } from './pages/RoomPage';

export function App() {
  const { path, navigate } = useRoute();
  const roomId = parseRoomPath(path);
  // key로 방이 바뀌면 상태를 완전히 새로 시작한다
  return roomId ? <RoomPage key={roomId} roomId={roomId} navigate={navigate} /> : <Landing navigate={navigate} />;
}
