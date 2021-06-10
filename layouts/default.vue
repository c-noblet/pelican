<template>
  <div>
    <Nuxt />
  </div>
</template>
<script>
export default {
  mounted() {
    this.setPlayerInfos();
  },
  methods: {
    setPlayerInfos() {
      this.$store.dispatch('auth/setUserInfos');
    },
  },
};
</script>
<style lang="scss">
</style>
