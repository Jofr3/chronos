<script setup>
  const { data: tasks } = await useFetch('/api/tasks/all')

  const adding_task = ref(false);

  function add_task() {
    adding_task.value = false;
  }
</script>

<template>
  <div class="tasks-view">
    <button class="add-task-button" @click="adding_task = true">Add task</button>

    <template v-if="adding_task">
      <div class="task-form">
      <input type="text"/>
      <button class="confirm-task-button" @click="add_task()">Add task</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tasks-view {
  height: 100%;
  width: 100%;
  
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px;

  .add-task-button {
    width: 100px;
  }

  .task-form {
    display: flex;
    gap: 10px;
  }
}
</style>
