import { api } from '../api.js';
import { auth } from '../auth.js';
import { renderForbidden } from './forbidden.js';

/**
 * Displays the form to create a new event, fitting the new UI design.
 * Only accessible to users with the 'admin' or 'organizer' role.
 * If the user is not authorized, it renders a forbidden view.
 */
export async function showCreateEvent() {
    const user = auth.getUser();
    if (user.role !== 'admin' && user.role !== 'organizer') {
        renderForbidden();
        return;
    }

    document.getElementById('view-title').textContent = 'Create a New Event';
    const contentEl = document.getElementById('app-content');

    const organizers = await api.get('/users?role=organizer');
    if (!organizers || organizers.length === 0) {
        alert('There are no organizers available. Please create an organizer first.');
        location.hash = '#/dashboard/users/create';
        return;
    }

    contentEl.innerHTML = `
        <div class="form-container">
            <form id="create-event-form">
                <div class="form-group">
                    <label for="title">Event Title</label>
                    <input id="title" placeholder="ex: Conference 2025" required>
                </div>
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" placeholder="A brief summary of the event content." required></textarea>
                </div>
                <div class="form-group">
                    <label for="category">Category</label>
                    <input id="category" placeholder="ex: Workshop" required>
                </div>
                <div class="form-group">
                    <label for="date">Event Date</label>
                    <input type="date" id="date" required min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label for="time">Event Time</label>
                    <input type="time" id="time" required>
                </div>
                ${user.role === 'admin' ? `<div class="form-group">
                    <label for="organizer">Organizer</label>
                    <select id="organizer" required>
                        ${organizers.map(i => `<option value="${i.name}">${i.name}</option>`).join('')}
                    </select>
                </div>` : ''}
                <div class="form-group">
                    <label for="capacity">Capacity</label>
                    <input type="number" id="capacity" placeholder="e.g., 25" required>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Save event</button>
                    <button type="button" id="cancel-btn" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>`;
    
    document.getElementById('create-event-form').onsubmit = async (event) => {
        event.preventDefault();
        
        // Validate that the date is in the future
        const eventDate = new Date(event.target.date.value + 'T' + event.target.time.value);
        const now = new Date();
        
        if (eventDate <= now) {
            alert('Event date and time must be in the future.');
            return;
        }
        
        const data = {
            title: event.target.title.value,
            description: event.target.description.value,
            category: event.target.category.value,
            date: event.target.date.value,
            time: event.target.time.value,
            organizer: user.role === 'admin' ? event.target.organizer.value : user.name,
            capacity: parseInt(event.target.capacity.value, 10),
            registered: []
        };
        await api.post('/events', data);
        location.hash = '#/dashboard/events';
    };

    document.getElementById('cancel-btn').onclick = () => {
        location.hash = '#/dashboard/events';
    };
}