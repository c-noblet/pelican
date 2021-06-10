<template>
  <div class="container mx-auto">
    <div>{{ game.id }}</div>
    <ul>
      <li v-for="gamePlayer in game.players" :key="gamePlayer.id">
        {{ gamePlayer.name }}
      </li>
    </ul>
    <button type="button" @click="startGame">start</button>
  </div>
</template>
<script>
export default {
  name: 'Room',
  computed: {
    player() {
      return this.$store.getters['game/player'];
    },
    game() {
      return this.$store.getters['game/game'];
    },
  },
  async mounted() {
    this.$store.dispatch('game/createPlayer');
    const userId = this.$store.getters['auth/user'].id;
    if (this.$route.query.id === userId) {
      this.$store.dispatch('game/createGame');
    } else {
      this.$p2p.connect(this.$route.query.id, this.$store.getters['auth/user']);
    }
  },
  updated() {
    if (this.game.gameState === 'started') {
      this.$p2p.sendGame();
      this.$router.push({
        path: `/game?id=${this.game.id}`,
      });
    }
  },
  methods: {
    async startGame() {
      this.$store.dispatch('game/startGame');
    },
  },
};
</script>
<style lang="scss">
</style>
