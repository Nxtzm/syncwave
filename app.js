const app = {
    config: {},
    user: null,
    queue: [],
    currentIdx: -1,
    ytPlayer: null,
    isPlaying: false,

    async init() {
        try {
            const res = await fetch('config.json');
            this.config = await res.json();
            this.setupListeners();
            console.log("App Initialized");
        } catch (e) {
            this.showToast("Error loading config.json");
        }
    },

    setupListeners() {
        document.getElementById('main-auth-btn').onclick = () => this.login();
        // Enter key for search
        document.getElementById('search-input').onkeydown = (e) => {
            if(e.key === 'Enter') this.doSearch();
        };
    },

    login() {
        const email = document.getElementById('auth-email').value;
        if (!email) return this.showToast("Enter an email");
        this.user = { name: email.split('@')[0], id: Date.now() };
        document.getElementById('screen-auth').classList.add('hidden');
        document.getElementById('screen-lobby').classList.remove('hidden');
        document.getElementById('lobby-username').innerText = this.user.name;
        this.renderRooms();
    },

    renderRooms() {
        const rooms = [
            { name: "Lofi Study", host: "Alex", count: 12 },
            { name: "Phonk Night", host: "Zero", count: 5 }
        ];
        const container = document.getElementById('active-rooms');
        container.innerHTML = rooms.map(r => `
            <div class="track-item" onclick="app.joinRoom('${r.name}')">
                <div class="track-info">
                    <div class="track-title">${r.name}</div>
                    <div class="track-artist">Hosted by ${r.host} • ${r.count} online</div>
                </div>
            </div>
        `).join('');
    },

    joinRoom(name) {
        document.getElementById('screen-lobby').classList.add('hidden');
        document.getElementById('screen-app').classList.remove('hidden');
        document.getElementById('topbar-room-name').innerText = name;
        this.showToast(`Joined ${name}`);
    },

    createRoom() {
        const name = document.getElementById('new-room-name').value || "New Room";
        this.joinRoom(name);
    },

    async doSearch() {
        const query = document.getElementById('search-input').value;
        if (!query) return;
        
        this.showToast("Searching...");
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${this.config.YOUTUBE_API_KEY}`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            this.renderResults(data.items);
        } catch (e) {
            this.showToast("Search failed. Check API Key.");
        }
    },

    renderResults(items) {
        const container = document.getElementById('results-area');
        container.innerHTML = items.map(item => `
            <div class="track-item" onclick="app.addToQueue('${item.id.videoId}', '${item.snippet.title.replace(/'/g, "")}', '${item.snippet.channelTitle}', '${item.snippet.thumbnails.default.url}')">
                <img src="${item.snippet.thumbnails.default.url}" class="track-thumb">
                <div class="track-info">
                    <div class="track-title">${item.snippet.title}</div>
                    <div class="track-artist">${item.snippet.channelTitle}</div>
                </div>
            </div>
        `).join('');
    },

    addToQueue(id, title, artist, thumb) {
        const track = { id, title, artist, thumb };
        this.queue.push(track);
        this.showToast("Added to queue");
        if (this.currentIdx === -1) this.playTrack(0);
        this.renderQueue();
    },

    renderQueue() {
        const container = document.getElementById('queue-list');
        container.innerHTML = this.queue.map((t, i) => `
            <div class="track-item ${i === this.currentIdx ? 'active' : ''}" onclick="app.playTrack(${i})">
                <div class="track-info">
                    <div class="track-title">${t.title}</div>
                    <div class="track-artist">${t.artist}</div>
                </div>
            </div>
        `).join('');
    },

    playTrack(index) {
        this.currentIdx = index;
        const track = this.queue[index];
        
        if (!this.ytPlayer) {
            this.ytPlayer = new YT.Player('yt-player-container', {
                height: '0', width: '0',
                videoId: track.id,
                events: {
                    'onReady': (e) => e.target.playVideo(),
                    'onStateChange': (e) => this.onPlayerStateChange(e)
                }
            });
        } else {
            this.ytPlayer.loadVideoById(track.id);
        }

        this.isPlaying = true;
        document.getElementById('np-title').innerText = track.title;
        document.getElementById('np-artist').innerText = track.artist;
        document.getElementById('np-art').style.backgroundImage = `url(${track.thumb})`;
        document.getElementById('np-art').style.backgroundSize = 'cover';
        this.updatePlayBtn();
    },

    togglePlay() {
        if (!this.ytPlayer) return;
        if (this.isPlaying) {
            this.ytPlayer.pauseVideo();
        } else {
            this.ytPlayer.playVideo();
        }
        this.isPlaying = !this.isPlaying;
        this.updatePlayBtn();
    },

    updatePlayBtn() {
        const icon = document.getElementById('play-icon');
        icon.innerHTML = this.isPlaying ? 
            '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>' : 
            '<polygon points="5 3 19 12 5 21 5 3"/>';
    },

    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
            this.nextTrack();
        }
    },

    nextTrack() {
        if (this.currentIdx < this.queue.length - 1) {
            this.playTrack(this.currentIdx + 1);
        }
    },

    prevTrack() {
        if (this.currentIdx > 0) {
            this.playTrack(this.currentIdx - 1);
        }
    },

    showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    },

    logout() {
        location.reload();
    }
};

// Initialize app on load
window.onload = () => app.init();