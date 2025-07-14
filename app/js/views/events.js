import { api } from '../api.js';
import { auth } from '../auth.js';
import { formatDateTime, isEventPast, getRelativeTime } from '../utils.js';

/**
 * Displays the list of events.
 * If the user is an organizer, it shows their events.
 * If the user is a guest, it shows available events.
 * If the user is not authenticated, it shows a forbidden view.
 * The view includes options to register for events, edit events (if admin or organizer), and delete events (if admin).
 * It also shows the number of available slots for each event.
 */
export async function showEvents() {
    const user = auth.getUser();
    document.getElementById('view-title').textContent = user.role === 'organizer' ? 'Your events' : 'Available events';
    const contentEl = document.getElementById('app-content');
    contentEl.innerHTML = `<div class="events-list"></div>`; // Placeholder

    let events = await api.get('/events');

    if (user.role === 'organizer') {
        events = events.filter(event => event.organizer === user.name || event.organizer === user.email);
    }

    const eventsListEl = contentEl.querySelector('.events-list');
    if (events.length === 0) {
        eventsListEl.innerHTML = `
            <div class="no-events">
                <div>
                    <i class="fa-solid fa-folder-open no-events-icon"></i>
                    <h3>No events Found</h3>
                    <p>There are no events to display at the moment.</p>
                </div>
            </div>`;
        return;
    }

    eventsListEl.innerHTML = events.map(event => {
        const isEnrolled = event.registered && event.registered.includes(user.email);
        const isFull = event.capacity <= 0;
        const isPast = isEventPast(event.date, event.time);
        
        let actionButton = '';
        if (user.role === 'guest') {
            if (isPast) {
                actionButton = `<button class="btn-secondary" disabled>Event Finished</button>`;
            } else if (isEnrolled) {
                actionButton = `<button class="btn-secondary" disabled>registered</button>`;
            } else if (isFull) {
                actionButton = `<button class="btn-danger" disabled>Full</button>`;
            } else {
                actionButton = `<button class="btn-primary register-btn" data-id="${event.id}">register</button>`;
            }
        }

        return `
        <div class="event-item ${isPast ? 'past-event' : ''}">
            <div class="event-header">
                <span class="event-category">${event.category || 'General'}</span>
                ${isPast ? '<span class="event-status past">Past Event</span>' : ''}
                <div class="event-actions">
                    ${user.role === 'admin'|| user.role === 'organizer' ? `
                        <button class="edit-btn" title="Edit event" data-id="${event.id}"><i class="fa-solid fa-pencil"></i></button>
                        <button class="delete-btn" title="Delete event" data-id="${event.id}"><i class="fa-solid fa-trash"></i></button>
                        <button class="view-registered-btn" title="View registered" data-id="${event.id}"><i class="fa-solid fa-users"></i></button>
                    ` : ''}
                </div>
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
                    <span title="Available Slots"><i class="fa-solid fa-chair"></i> ${event.capacity || 0}</span>
                </div>
            </div>
            ${user.role === 'guest' ? `<div class="event-footer">${actionButton}</div>` : ''}
        </div>
    `}).join('');

    // --- Add Event Listeners ---
    if (user.role === 'admin' || user.role === 'organizer') {
        eventsListEl.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = () => location.hash = `#/dashboard/events/edit/${btn.dataset.id}`;
        });
        eventsListEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Are you sure you want to delete this event?')) {
                    await api.delete(`/events/${btn.dataset.id}`);
                    showEvents(); // Reload list
                }
            };
        });
    }

    if (user.role === 'admin' || user.role === 'organizer') {
        eventsListEl.querySelectorAll('.view-registered-btn').forEach(btn => {
            btn.onclick = async () => {
                const event = await api.get(`/events/${btn.dataset.id}`);
                const enrolledList = event.registered && event.registered.length > 0
                    ? event.registered.join('\n')
                    : 'There are no guests registered in this event.';
                alert(`registered Guests:\n\n${enrolledList}`);
            };
        });
    }

    if (user.role === 'guest') {
        eventsListEl.querySelectorAll('.register-btn').forEach(btn => {
            btn.onclick = async () => {
                const eventId = btn.dataset.id;
                const event = await api.get(`/events/${eventId}`);
                
                // Check if event is in the past
                if (isEventPast(event.date, event.time)) {
                    alert('Cannot register for past events.');
                    return;
                }
                
                if (!event.registered) event.registered = [];
                if (event.registered.includes(user.email)) {
                    alert('You are already registered.');
                    return;
                }
                if (event.capacity <= 0) {
                    alert('This event is full.');
                    return;
                }

                event.registered.push(user.email);
                event.capacity -= 1;

                await api.patch(`/events/${eventId}`, {
                    registered: event.registered,
                    capacity: event.capacity
                });
                alert('Registration successful!');
                showEvents(); // Reload list
            };
        });
    }
}