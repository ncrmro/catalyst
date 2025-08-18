require 'cgi'

class GithubController < ApplicationController
  # Handle GitHub App installation initiation
  def register
    state = params[:state] || 'default'
    
    # GitHub App installation URL
    # In a real implementation, this would use the actual GitHub App ID
    github_app_id = ENV['GITHUB_APP_ID'] || 'your-app-id'
    installation_url = "https://github.com/apps/#{github_app_id}/installations/new"
    
    # Add state parameter for security and tracking
    redirect_url = "#{installation_url}?state=#{CGI.escape(state)}"
    
    redirect_to redirect_url, allow_other_host: true
  end

  # Handle GitHub App installation callback
  def callback
    installation_id = params[:installation_id]
    setup_action = params[:setup_action]
    state = params[:state]
    code = params[:code]

    case setup_action
    when 'install'
      handle_installation(installation_id, state)
    when 'request'
      handle_installation_request(installation_id, state)
    when 'update'
      handle_installation_update(installation_id, state)
    else
      handle_generic_callback(installation_id, setup_action, state, code)
    end
  rescue => e
    Rails.logger.error "GitHub callback error: #{e.message}"
    redirect_to root_path, alert: "GitHub installation failed: #{e.message}"
  end

  private

  def handle_installation(installation_id, state)
    Rails.logger.info "GitHub App installed successfully - installation_id: #{installation_id}, state: #{state}"
    
    # In a real app, you would:
    # 1. Store the installation_id in your database
    # 2. Associate it with the current user
    # 3. Set up any necessary configurations
    
    flash[:notice] = "GitHub App installed successfully! You can now select repositories."
    redirect_to repositories_path
  end

  def handle_installation_request(installation_id, state)
    Rails.logger.info "GitHub App installation requested - installation_id: #{installation_id}, state: #{state}"
    
    flash[:notice] = "GitHub App installation requested. Waiting for organization approval."
    redirect_to root_path
  end

  def handle_installation_update(installation_id, state)
    Rails.logger.info "GitHub App installation updated - installation_id: #{installation_id}, state: #{state}"
    
    flash[:notice] = "GitHub App installation updated successfully."
    redirect_to repositories_path
  end

  def handle_generic_callback(installation_id, setup_action, state, code)
    Rails.logger.info "GitHub callback received - installation_id: #{installation_id}, setup_action: #{setup_action}, state: #{state}, code: #{code}"
    
    flash[:notice] = "GitHub callback processed successfully."
    redirect_to root_path
  end
end