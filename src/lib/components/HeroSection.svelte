<script lang="ts">
	export let title: string
	export let subtitle: string = ''
	export let ctaText: string = ''
	export let ctaUrl: string = ''
	export let backgroundColor: string = '#3B82F6'
	export let textColor: string = 'white'
	export let showCta: boolean = true
	export let size: 'small' | 'medium' | 'large' = 'large'
	export let backgroundImage: string = ''
	
	$: paddingClass = {
		small: 'py-8',
		medium: 'py-12',
		large: 'py-16'
	}[size]
	
	$: titleClass = {
		small: 'text-2xl',
		medium: 'text-3xl',
		large: 'text-4xl'
	}[size]
	
	$: subtitleClass = {
		small: 'text-lg',
		medium: 'text-xl', 
		large: 'text-xl'
	}[size]
</script>

<section 
	class="{paddingClass} text-center relative overflow-hidden"
	style="background: {backgroundImage ? `url(${backgroundImage})` : `linear-gradient(135deg, ${backgroundColor}, color-mix(in srgb, ${backgroundColor} 80%, transparent))`}; color: {textColor}; background-size: cover; background-position: center;"
>
	{#if backgroundImage}
		<div class="absolute inset-0 bg-black opacity-30"></div>
	{:else}
		<div class="absolute inset-0 bg-black opacity-10"></div>
	{/if}
	
	<div class="relative container mx-auto px-6">
		<div class="max-w-4xl mx-auto">
			<h1 class="{titleClass} font-bold mb-4">
				{title}
			</h1>
			
			{#if subtitle}
				<p class="{subtitleClass} text-white/90 mb-8 max-w-2xl mx-auto">
					{subtitle}
				</p>
			{/if}
			
			{#if showCta && ctaText && ctaUrl}
				<a
					href={ctaUrl}
					class="inline-block px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
				>
					{ctaText}
				</a>
			{/if}
			
			<slot name="additional-content" />
		</div>
	</div>
</section>