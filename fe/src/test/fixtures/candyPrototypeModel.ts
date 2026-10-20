export const PANEL_LABELS = {
  menu:'Menu',settings:'Bố cục & bản thử',chat:'Chat phòng','chat-settings':'Quản lý chat','chat-join':'Mã mời chat',safety:'Người chơi & an toàn',report:'Báo cáo tin nhắn',journal:'Nhật ký',card:'Chi tiết thẻ',inventory:'Bộ thẻ',gift:'Tặng Coin',player:'Chi tiết người chơi',avatar:'Chọn chân dung',guide:'Hướng dẫn',join:'Tìm phòng',create:'Tạo phòng',response:'Chia sẻ',guess:'Chọn người chơi',role:'Vai trò của bạn',connection:'Trạng thái kết nối',leave:'Rời phòng',confirm:'Chuyển bước',support:'Hỗ trợ',
} as const
export type Panel=keyof typeof PANEL_LABELS
export type Message={id:number;sender:string;text:string}
export type ChatState='ready'|'disabled'|'invite'|'muted'|'offline'|'pending'|'error'
export const CHAT_STATES:Record<ChatState,string>={ready:'Sẵn sàng',disabled:'Chưa mở chat',invite:'Cần mã mời',muted:'Bị tắt quyền gửi',offline:'Mất kết nối',pending:'Đang gửi mẫu',error:'Gửi chưa thành công'}
