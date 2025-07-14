import { api } from '../api.js';
import { auth } from '../auth.js';
import { renderForbidden } from './forbidden.js';

/**
 * Displays the management interface for users.
 * Only accessible to users with the 'admin' role.
 * If the user is not an admin, it renders a forbidden view.
 */
export async function showManageUsers() {
    const user = auth.getUser();
    if (user.role !== 'admin') {
        renderForbidden();
        return;
    }

    document.getElementById('view-title').textContent = 'Manage Users';
    const contentEl = document.getElementById('app-content');

    contentEl.innerHTML = `
        <div class="page-header">
            <h2>All Users</h2>
            <button id="create-user-btn" class="btn-primary">
                <i class="fa-solid fa-plus"></i> Create User
            </button>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="users-tbody"></tbody>
            </table>
        </div>`;

    document.getElementById('create-user-btn').onclick = () => {
        location.hash = '#/dashboard/users/create';
    };

    const tbody = document.getElementById('users-tbody');
    
    async function loadUsers() {
        const users = await api.get('/users');
        if (!users || users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No users registered.</td></tr>`;
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td class="actions-cell">
                    <button class="btn-secondary edit-user" data-id="${u.id}">Edit</button>
                    <button class="btn-danger delete-user" data-id="${u.id}" ${u.id === user.id ? 'disabled' : ''}>Delete</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.edit-user').forEach(button => {
            button.onclick = () => location.hash = `#/dashboard/users/edit/${button.dataset.id}`;
        });
        tbody.querySelectorAll('.delete-user').forEach(button => {
            button.onclick = () => deleteUser(button.dataset.id);
        });
    }

    async function deleteUser(id) {
        const userToDelete = await api.get(`/users/${id}`);
        if (confirm(`Are you sure you want to delete ${userToDelete.name}? This action cannot be undone.`)) {
            await api.delete(`/users/${id}`);

            if (userToDelete?.email) {
                const events = await api.get('/events');
                for (const event of events) {
                    // Verify if the user is registered in this event
                    if (Array.isArray(event.registered) && event.registered.includes(userToDelete.email)) {
                        const newEnrolled = event.registered.filter(email => email !== userToDelete.email);
                        const newCapacity = event.capacity + 1;
                        await api.patch(`/events/${event.id}`, { registered: newEnrolled, capacity: newCapacity });
                    }
                }
            }
            loadUsers();
        }
    }
    loadUsers();
}