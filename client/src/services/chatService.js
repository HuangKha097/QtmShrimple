import api from '../lib/axios.js'


export const chatService = {
    async fetchConversations() {
        const res = await api.get("/api/conversations");
        return res.data;
    },
    async fetchMessage(id, cursor) {

        const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
        const res = await api.get(`/api/conversations/${id}/messages?limit=50${cursorParam}`);
        return {messages: res.data.messages, cursor: res.data.nextCursor};
    },
    async sendDirectMessage(recipientId, content, conversationId, image, file, type) {

        const res = await api.post(`/api/messages/direct`, {
            recipientId,
            content,
            conversationId,
            image,
            file,
            type
        });
        return res.data;
    } ,
    async sendGroupMessage(conversationId, content, image, file, type) {

        const res = await api.post(`/api/messages/group`, {
            conversationId, content, image, file, type
        });
        return res.data;
    } ,
    async createConversation(isGroup, name, memberIds, recipientId) {
        const res = await api.post(`/api/conversations/`, {
            isGroup, name, memberIds, recipientId
        });
        return res.data;
    },
    async reactToMessage(messageId, reaction) {
        const res = await api.post(`/api/messages/reaction`, {
            messageId, reaction
        })
        return res.data;
    },
    async getSharedMedia(conversationId) {
        const res = await api.get(`/api/conversations/${conversationId}/media`);
        return res.data;
    },
    async markAsRead(conversationId) {
        const res = await api.patch(`/api/conversations/${conversationId}/read`);
        return res.data;
    },
    async recallMessage(id) {
        const res = await api.put(`/api/messages/${id}/recall`);
        return res.data;
    },
    async deleteMessageForMe(id) {
        const res = await api.put(`/api/messages/${id}/delete-for-me`);
        return res.data;
    },
    async togglePinMessage(id) {
        const res = await api.put(`/api/messages/${id}/pin`);
        return res.data;
    },
    async forwardMessage(id, targetConversationIds) {
        const res = await api.post(`/api/messages/${id}/forward`, { targetConversationIds });
        return res.data;
    },
    async getPinnedMessages(conversationId) {
        const res = await api.get(`/api/conversations/${conversationId}/pins`);
        return res.data;
    }
}