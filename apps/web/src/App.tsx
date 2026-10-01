import { parseRoomPath, useRoute } from './lib/useRoute';
import { parseLegalPath } from './lib/legalMeta';
import { Landing } from './pages/Landing';
import { Legal } from './pages/Legal';
import { RoomPage } from './pages/RoomPage';

export function App() {
  const { path, navigate } = useRoute();
  const roomId = parseRoomPath(path);
  const legal = parseLegalPath(path);
  // key로 방이 바뀌면 상태를 완전히 새로 시작한다
  if (roomId) return <RoomPage key={roomId} roomId={roomId} navigate={navigate} />;
  if (legal) return <Legal kind={legal} navigate={navigate} />;
  return <Landing navigate={navigate} />;
}
