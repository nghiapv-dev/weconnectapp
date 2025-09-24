import ChatList from "./chatList/ChatList"
import Userinfo from "./userInfo/Userinfo"

const List = ({ onOpenEditProfile, onSelectChat }) => {
  return (
    <div className='flex-1 flex flex-col h-full'>
      <Userinfo onOpenEditProfile={onOpenEditProfile} />
      <ChatList onSelectChat={onSelectChat} />
    </div>
  )
}

export default List