{{/*
Expand the name of the chart.
*/}}
{{- define "catalyst.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "catalyst.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "catalyst.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "catalyst.labels" -}}
helm.sh/chart: {{ include "catalyst.chart" . }}
{{ include "catalyst.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "catalyst.selectorLabels" -}}
app.kubernetes.io/name: {{ include "catalyst.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Web labels
*/}}
{{- define "catalyst.web.labels" -}}
{{ include "catalyst.labels" . }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Web selector labels
*/}}
{{- define "catalyst.web.selectorLabels" -}}
{{ include "catalyst.selectorLabels" . }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Operator labels
*/}}
{{- define "catalyst.operator.labels" -}}
{{ include "catalyst.labels" . }}
app.kubernetes.io/component: operator
{{- end }}

{{/*
Operator selector labels
*/}}
{{- define "catalyst.operator.selectorLabels" -}}
{{ include "catalyst.selectorLabels" . }}
app.kubernetes.io/component: operator
{{- end }}

{{/*
Create the name of the service account to use for operator
*/}}
{{- define "catalyst.operator.serviceAccountName" -}}
{{- if .Values.operator.serviceAccount.create }}
{{- default (printf "%s-operator" (include "catalyst.fullname" .)) .Values.operator.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.operator.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Web image
*/}}
{{- define "catalyst.web.image" -}}
{{- $tag := .Values.web.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.web.image.repository $tag }}
{{- end }}

{{/*
Operator image
*/}}
{{- define "catalyst.operator.image" -}}
{{- $tag := .Values.operator.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.operator.image.repository $tag }}
{{- end }}
