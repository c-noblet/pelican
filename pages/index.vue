<template>
  <div class="grid grid-cols-2">
    <div class="left-panel container">
      <h2>Create a new game</h2>
      <button class="btn" @click="newGame">new</button>
    </div>
    <div class="right-panel">
      <h2>Join a game</h2>
      <input type="text" v-model="joinId" placeholder="Type the game id" />
      <button class="btn" @click="joinGame">Join</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
  data() {
    return {
      joinId: '',
    };
  },
  methods: {
    newGame() {
      const { id } = this.$store.getters['auth/user'];
      this.$router.push({
        path: `/room?id=${id}`,
      });
    },
    joinGame() {
      this.$router.push({
        path: `/room?id=${this.joinId}`,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.grid {
  height: 100vh;
}
</style>
