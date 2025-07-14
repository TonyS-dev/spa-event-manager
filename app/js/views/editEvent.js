import { api } from '../api.js';
import { auth } from '../auth.js';
import { renderForbidden } from './forbidden.js';
import { renderNotFound } from './notFound.js';

/**
 * Displays the form to edit an existing event, fitting the new UI design.
 * Only accessible to users with the 'admin' or 'organizer' role.
 * If the user is not authorized, it renders a forbidden view.
 * If the event does not exist, it renders a not found view.
 */
export async function showEditEvent(eventId) {
    const user = auth.getUser();
    if (user.role !== 'admin' && user.role !== 'organizer') {
        renderForbidden();
        return;
    }

    document.getElementById('view-title').textContent = 'Edit Event';
    const contentEl = document.getElementById('app-content');
    
    const [event, organizers] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get('/users?role=organizer')
    ]);

    if (!event) {
        renderNotFound();
        return;
    }
    
    contentEl.innerHTML = `
        <div class="form-container">
            <form id="edit-event-form">
                <div class="form-group">
                    <label for="title">Event Title</label>
                    <input id="title" value="${event.title}" required>
                </div>
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" required>${event.description}</textarea>
                </div>
                <div class="form-group">
                    <label for="category">Category</label>
                    <input id="category" value="${event.category}" required>
                </div>
                <div class="form-group">
                    <label for="date">Event Date</label>
                    <input type="date" id="date" value="${event.date || ''}" required min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label for="time">Event Time</label>
                    <input type="time" id="time" value="${event.time || ''}" required>
                </div>
                ${user.role === 'admin' ? `<div class="form-group">
                    <label for="organizer">Organizer</label>
                    <select id="organizer" required>
                        ${organizers.map(i => `<option value="${i.name}" ${i.name === event.organizer ? 'selected' : ''}>${i.name}</option>`).join('')}
                    </select>
                </div>` : ''}
                <div class="form-group">
                    <label for="capacity">Capacity</label>
                    <input type="number" id="capacity" value="${event.capacity}" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Save Changes</button>
                    <button type="button" id="cancel-btn" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('edit-event-form').onsubmit = async (event) => {
        event.preventDefault();
        
        // Validate that the date is in the future
        const eventDate = new Date(event.target.date.value + 'T' + event.target.time.value);
        const now = new Date();
        
        if (eventDate <= now) {
            alert('Event date and time must be in the future.');
            return;
        }
        
        const updated = {
            title: event.target.title.value,
            description: event.target.description.value,
            category: event.target.category.value,
            date: event.target.date.value,
            time: event.target.time.value,
            organizer: user.role === 'admin' ? event.target.organizer.value : user.name,
            capacity: parseInt(event.target.capacity.value, 10),
        };
        await api.patch(`/events/${eventId}`, updated);
        location.hash = '#/dashboard/events';
    };

    document.getElementById('cancel-btn').onclick = () => {
        location.hash = '#/dashboard/events';
    };
}