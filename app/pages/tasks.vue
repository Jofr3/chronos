<script setup>
  const { data: tasks } = await useFetch('/api/tasks/all')
</script>

<template>
  {{ tasks }}
</template>
