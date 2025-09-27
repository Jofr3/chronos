<template>
  <div>
    <div class="links">
    <NuxtLink to="/tasks">Tasks</NuxtLink>
    <NuxtLink to="/calendar">Calendar</NuxtLink>
    </div>

    <slot />
  </div>
</template>

<style scoped>
.links {
  height: 20px;
  width: 100%;

  display: flex;
  gap: 10px;

  padding: 10px;

  a {
    text-decoration: none;
    color: black;
  }
}
</style>
