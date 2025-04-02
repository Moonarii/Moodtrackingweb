// API endpoints
const API_BASE_URL = 'http://localhost:8000/api';
const ENDPOINTS = {
    moods: `${API_BASE_URL}/moods/`,
    analytics: `${API_BASE_URL}/moods/analytics/`,
    login: `${API_BASE_URL}/login/`
};

// Mood definitions with corresponding recommendations
const moodDefinitions = {
    'joy': {
        theme: 'theme-joy',
        recommendations: [
            'Keep up the positive energy! Try sharing your joy with others.',
            'Document what made you feel this way to reflect on later.',
            'Channel this energy into a creative project or hobby.'
        ]
    },
    'sadness': {
        theme: 'theme-sadness',
        recommendations: [
            'Remember that it\'s okay to feel this way. Take it easy on yourself.',
            'Consider talking to someone you trust about your feelings.',
            'Try some gentle exercise or stretching to lift your mood.'
        ]
    },
    'anger': {
        theme: 'theme-anger',
        recommendations: [
            'Take deep breaths and try to stay calm.',
            'Consider what\'s triggering this emotion.',
            'Channel this energy into productive activities.'
        ]
    },
    'fear': {
        theme: 'theme-fear',
        recommendations: [
            'Remember that it\'s normal to feel afraid sometimes.',
            'Try grounding exercises to feel more secure.',
            'Break down what\'s causing your fear into smaller, manageable parts.'
        ]
    },
    'anticipation': {
        theme: 'theme-anticipation',
        recommendations: [
            'Channel this energy into planning and preparation.',
            'Share your ideas and expectations with others.',
            'Stay focused on the present while looking forward.'
        ]
    },
    'tired': {
        theme: 'theme-tired',
        recommendations: [
            'Listen to your body and take rest if needed.',
            'Consider your sleep schedule and habits.',
            'Try some light stretching or fresh air.'
        ]
    },
    'neutral': {
        theme: 'theme-neutral',
        recommendations: [
            'Take a moment for mindfulness or meditation.',
            'A brief walk outside might help lift your spirits.',
            'Try listing three things you\'re grateful for today.'
        ]
    }
};

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    setupMoodButtons();
    try {
        // First try to fetch CSRF token
        await fetchCSRFToken();
        await updateChart();
        await updateInsights();
        updateTheme('neutral'); // Default theme
    } catch (error) {
        if (error.message === 'Unauthorized') {
            window.location.href = '/login.html';
        } else {
            console.error('Error initializing page:', error);
        }
    }
});

// Fetch CSRF token
async function fetchCSRFToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/csrf/`, {
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error('Failed to fetch CSRF token');
        }
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        throw error;
    }
}

// Setup mood selection buttons
function setupMoodButtons() {
    const moodButtons = document.querySelectorAll('.mood-btn');
    moodButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selection from all buttons
            moodButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selection to clicked button
            button.classList.add('selected');
            // Update UI theme
            updateTheme(button.dataset.mood);
        });
    });

    // Setup save button
    document.getElementById('saveMood').addEventListener('click', saveMoodEntry);
}

// Save mood entry
async function saveMoodEntry() {
    const selectedMood = document.querySelector('.mood-btn.selected');
    if (!selectedMood) {
        alert('Please select a mood first!');
        return;
    }

    const moodData = {
        mood: selectedMood.dataset.mood,
        note: document.getElementById('moodNote').value
    };

    try {
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            await fetchCSRFToken();
        }

        const response = await fetch(ENDPOINTS.moods, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            credentials: 'include',
            body: JSON.stringify(moodData)
        });

        if (response.status === 401) {
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save mood');
        }

        // Update UI
        await Promise.all([
            updateChart(),
            updateInsights()
        ]);
        updateRecommendations(moodData.mood);

        // Reset form
        document.getElementById('moodNote').value = '';
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));

        alert('Mood saved successfully!');
    } catch (error) {
        console.error('Error saving mood:', error);
        if (error.message === 'Unauthorized') {
            window.location.href = '/login.html';
        } else {
            alert(error.message || 'Failed to save mood. Please try again.');
        }
    }
}

// Update theme based on mood
function updateTheme(mood) {
    document.body.className = moodDefinitions[mood].theme;
    updateRecommendations(mood);
}

// Update recommendations
function updateRecommendations(mood) {
    const recommendationsContainer = document.getElementById('recommendations');
    const recommendations = moodDefinitions[mood].recommendations;
    
    recommendationsContainer.innerHTML = recommendations.map(rec => `
        <div class="recommendation-item">
            <i class="fas fa-lightbulb"></i> ${rec}
        </div>
    `).join('');
}

// Update mood insights
async function updateInsights() {
    try {
        const response = await fetch(ENDPOINTS.analytics, {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        const insightsContainer = document.getElementById('moodInsights');
        
        insightsContainer.innerHTML = `
            <p>Last 7 days summary:</p>
            <p>Most frequent mood: ${data.most_common_mood || 'No data'}</p>
            <p>Total entries: ${data.total_entries}</p>
        `;
    } catch (error) {
        console.error('Error fetching insights:', error);
        if (error.message === 'Unauthorized') {
            window.location.href = '/login.html';
        }
        throw error;
    }
}

// Update mood chart
async function updateChart() {
    try {
        const response = await fetch(ENDPOINTS.analytics, {
            credentials: 'include'
        });

        if (response.status === 401) {
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            throw new Error('Failed to fetch mood data');
        }

        const data = await response.json();
        const ctx = document.getElementById('moodChart').getContext('2d');

        // Convert moods to numerical values for the chart
        const moodValues = {
            'joy': 5,
            'sadness': 4,
            'anger': 3,
            'fear': 2,
            'anticipation': 1,
            'tired': 1,
            'neutral': 3
        };

        const chartData = data.mood_trend.map(entry => ({
            x: new Date(entry.timestamp),
            y: moodValues[entry.mood]
        }));

        // Destroy existing chart if it exists
        if (window.moodChart) {
            window.moodChart.destroy();
        }

        window.moodChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Mood Trend',
                    data: chartData,
                    borderColor: getComputedStyle(document.documentElement)
                        .getPropertyValue('--primary-color'),
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        min: 1,
                        max: 5,
                        ticks: {
                            callback: function(value) {
                                return Object.keys(moodValues)
                                    .find(key => moodValues[key] === value);
                            }
                        }
                    },
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating chart:', error);
        if (error.message === 'Unauthorized') {
            window.location.href = '/login.html';
        }
        throw error;
    }
}

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
} 