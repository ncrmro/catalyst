Rails.application.routes.draw do
  # GitHub App integration routes
  get "github/register", to: "github#register", as: :github_register
  get "github/callback", to: "github#callback", as: :github_callback
  
  # Repository management routes
  resources :repositories, only: [:index]
  post "repositories/:id/enable", to: "repositories#enable", as: :enable_repository
  
  # Legacy articles routes (kept for reference)
  resources :articles
  
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/") - now points to GitHub App installation flow
  root "home#index"
end
