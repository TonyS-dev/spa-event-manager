import { api } from '../api.js';
import { auth } from '../auth.js';
import { renderForbidden } from './forbidden.js';
import { formatDateTime, isEventPast, getRelativeTime } from '../utils.js';

/**
 * Displays the user's registered events.
 * Only accessible to users with the 'guest' role.
 * If the user is not a guest, it renders a forbidden view.
 */
export async function showMyEvents() {
    const user = auth.getUser();
    if (user.role !== 'guest') {
        renderForbidden();
        return;
    }
    
    document.getElementById('view-title').textContent = 'My events';
    const contentEl = document.getElementById('app-content');
    contentEl.innerHTML = `<div class="events-list"></div>`; // Placeholder

    let events = await api.get('/events');
    events = events.filter(a => Array.isArray(a.registered) && a.registered.includes(user.email));

    const eventsListEl = contentEl.querySelector('.events-list');
    if (events.length === 0) {
        eventsListEl.innerHTML = `
            <div class="no-events">
                <div>
                    <i class="fa-solid fa-book-open-reader no-events-icon"></i>
                    <h3>You're Not registered in Any events</h3>
                    <p>Visit the 'View events' page to find something new to discover!</p>
                </div>
            </div>`;
        return;
    }

    eventsListEl.innerHTML = events.map(event => {
        const isPast = isEventPast(event.date, event.time);
        
        return `
        <div class="event-item ${isPast ? 'past-event' : ''}">
            <div class="event-header">
                <span class="event-category">${event.category || 'General'}</span>
                ${isPast ? '<span class="event-status past">Past Event</span>' : ''}
            </div>
            <div class="event-content">
                <h3 class="event-name">${event.title || 'No Title'}</h3>
                <p class="event-description">${event.description || 'No description available.'}</p>
                <div class="event-datetime">
                    <span class="event-date" title="Event Date and Time">
                        <i class="fa-solid fa-calendar-days"></i> ${formatDateTime(event.date, event.time)}
                    </span>
                    <span class="event-relative-time">${getRelativeTime(event.date, event.time)}</span>
                </div>
                <div class="event-meta">
                    <span title="organizer"><i class="fa-solid fa-chalkboard-user"></i> ${event.organizer || 'N/A'}</span>
                </div>
            </div>
        </div>
    `}).join('');
}