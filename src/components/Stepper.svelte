<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';

  let currentStep = 1;
  const totalSteps = 4;
  let showModal = false;

  const dispatch = createEventDispatcher();

  onMount(() => {
    const isFirstTime = !localStorage.getItem('hasVisited');
    if (isFirstTime) {
      showModal = true;
      localStorage.setItem('hasVisited', 'true');
    }
  });

  function nextStep() {
    if (currentStep < totalSteps) {
      currentStep += 1;
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep -= 1;
    }
  }

  function finish() {
    showModal = false;
    dispatch('close');
  }
</script>

{#if showModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800 text-center mb-4">Welcome!</h2>
        <div class="flex justify-between items-center">
          {#each Array(totalSteps) as _, i}
            <div class="flex items-center">
              <div
                class="rounded-full h-8 w-8 flex items-center justify-center text-white"
                class:bg-blue-500={i + 1 <= currentStep}
                class:bg-gray-300={i + 1 > currentStep}
              >
                {i + 1}
              </div>
              {#if i < totalSteps - 1}
                <div
                  class="flex-auto border-t-2 transition-all duration-500 ease-in-out"
                  class:border-blue-500={i + 1 < currentStep}
                  class:border-gray-300={i + 1 >= currentStep}
                ></div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="min-h-[200px] mb-6">
        {#if currentStep === 1}
          <div>
            <h3 class="text-xl font-semibold mb-2">Step 1: Lorem Ipsum</h3>
            <p class="text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        {:else if currentStep === 2}
          <div>
            <h3 class="text-xl font-semibold mb-2">Step 2: Dolor Sit Amet</h3>
            <p class="text-gray-600">
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        {:else if currentStep === 3}
          <div>
            <h3 class="text-xl font-semibold mb-2">Step 3: Consectetur Adipiscing</h3>
            <p class="text-gray-600">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
          </div>
        {:else if currentStep === 4}
          <div>
            <h3 class="text-xl font-semibold mb-2">Step 4: Excepteur Sint</h3>
            <p class="text-gray-600">
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
        {/if}
      </div>

      <div class="flex justify-between">
        <button
          on:click={prevStep}
          disabled={currentStep === 1}
          class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {#if currentStep < totalSteps}
          <button
            on:click={nextStep}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Next
          </button>
        {:else}
          <button
            on:click={finish}
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Finish
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
