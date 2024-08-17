pipeline {

  agent any

  environment {
      REPO="chadwpalm"
      IMAGE_NAME="lumunarr"
      BUILD_CRED=credentials('b5555926-7439-43d8-a28d-f0e3b9b67724')
  }

  options {
      timeout (time: 10, unit: 'MINUTES')
      buildDiscarder (logRotator (numToKeepStr: '3'))
  }

  stages { 
    stage('Login') {
      steps {
        withCredentials([usernamePassword(credentialsId: '71aeb696-0670-4267-8db4-8ee74774e051', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {              
          sh ('echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin')
        }
      }
    }
    stage('Build Dev') {
      when {
        branch "develop"
      }
      steps {
        script {
          def JSONVersion = readJSON file: "version.json"
          def PulledVersion = JSONVersion.version
          def BuildNumber = sh (
            script: 'curl https://increment.build/${BUILD_CRED}',
            returnStdout: true
          ).trim()
          def APPVersion = "${PulledVersion}.${BuildNumber}"
          sh "docker build --force-rm --pull --build-arg BUILD='${BuildNumber}' -t ${REPO}/${IMAGE_NAME}:develop-${APPVersion} ."
          sh "docker tag ${REPO}/${IMAGE_NAME}:develop-${APPVersion} ${REPO}/${IMAGE_NAME}:develop"
          sh "docker push ${REPO}/${IMAGE_NAME}:develop-${APPVersion}"
          sh "docker push ${REPO}/${IMAGE_NAME}:develop"          
          sh "docker rmi ${REPO}/${IMAGE_NAME}:develop-${APPVersion}"
        }
        
      }
    }
    stage('Build Prod') {
      when {
        branch "main"
      }
      steps {
        script {
          def JSONVersion = readJSON file: "version.json"
          def PulledVersion = JSONVersion.version
          def BuildNumber = sh (
            script: 'curl https://increment.build/${BUILD_CRED}/get',
            returnStdout: true
          ).trim()
          def APPVersion = "${PulledVersion}.${BuildNumber}"
          sh "docker build --force-rm --pull --build-arg BUILD='${BuildNumber}' -t ${REPO}/${IMAGE_NAME}:${APPVersion} ."
          sh "docker tag ${REPO}/${IMAGE_NAME}:${APPVersion} ${REPO}/${IMAGE_NAME}:latest"
          sh "docker push ${REPO}/${IMAGE_NAME}:${APPVersion}"
          sh "docker push ${REPO}/${IMAGE_NAME}:latest"
          sh "docker rmi ${REPO}/${IMAGE_NAME}:${APPVersion}"
        }
      }
    }
    stage('Build Features/Fixes') {
      when {
        not {
           anyOf {
            branch "main";
            branch "develop"
          }
        }
      }
      steps {
        script {
          def JSONVersion = readJSON file: "version.json"
          def PulledVersion = JSONVersion.version
          def BuildNumber = sh (
            script: 'curl https://increment.build/${BUILD_CRED}',
            returnStdout: true
          ).trim()
          def APPVersion = "${PulledVersion}.${BuildNumber}"
          sh "docker build --force-rm --pull --build-arg BUILD=${BuildNumber} -t ${REPO}/${IMAGE_NAME}:${BRANCH_NAME}-${APPVersion} ."
          sh "docker push ${REPO}/${IMAGE_NAME}:${BRANCH_NAME}-${APPVersion}"
        }
      }
    }
  }
}

